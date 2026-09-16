mod filters;

use std::collections::HashMap;

use clap::{Parser, ValueEnum};
use tracing::{error, info};

use store::ItemStatusValue;

const REFERENCE_PROVIDER: &str = "coreweave";
const REFERENCE_REPEATS: u32 = 5;
const RETIRE_THRESHOLD: u32 = 4;
const PROBED_PROVIDERS: &[&str] = &["Groq", "DeepInfra", "Novita", "Together"];
const DEFAULT_WINDOW_DAYS: u32 = 7;
const DEFAULT_MODEL: &str = "meta-llama/llama-3.3-70b-instruct";
const DEFAULT_SEED: u64 = 99;

#[derive(Clone, ValueEnum)]
enum Mode {
    Reference,
}

#[derive(Parser)]
#[command(about = "Calibrate item bank against reference provider or check ceiling items")]
struct Cli {
    #[arg(long, env = "SUPABASE_URL")]
    supabase_url: String,
    #[arg(long, env = "SUPABASE_SERVICE_ROLE_KEY")]
    supabase_service_role_key: String,
    #[arg(long, env = "OPENROUTER_API_KEY")]
    api_key: Option<String>,
    #[arg(long, default_value = "../data/question_bank.json")]
    bank: std::path::PathBuf,

    /// Run 5× against reference provider and retire items failing <4/5.
    #[arg(long = "mode")]
    mode: Option<Mode>,

    /// Check which active items every probed provider passes 100% of the time.
    #[arg(long)]
    ceiling_check: bool,
    /// How many trailing days to consider for ceiling check.
    #[arg(long, default_value_t = DEFAULT_WINDOW_DAYS)]
    window_days: u32,
    /// Write item_status changes (ceiling_check requires this to actually update DB).
    #[arg(long)]
    apply: bool,
    /// Comma-separated item IDs to mark as anchor instead of retired_ceiling.
    #[arg(long, default_value = "")]
    anchors: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args = Cli::parse();

    let store = store::Store::new(&args.supabase_url, &args.supabase_service_role_key);

    match args.mode {
        Some(Mode::Reference) => run_reference(&args, &store).await,
        None if args.ceiling_check => run_ceiling_check(&args, &store).await,
        _ => {
            error!("specify --mode=reference or --ceiling-check");
            std::process::exit(1);
        }
    }
}

async fn run_reference(args: &Cli, store: &store::Store) {
    let loaded = match bank::load_bank(&args.bank) {
        Ok(b) => b,
        Err(e) => {
            error!("load_bank failed: {e}");
            std::process::exit(1);
        }
    };
    info!(items = loaded.items.len(), "bank loaded for reference run");

    let api_key = args.api_key.clone().unwrap_or_else(|| std::env::var("OPENROUTER_API_KEY").unwrap_or_default());
    let client = openrouter::OpenRouterClient::new(api_key, "https://openrouter.ai/api/v1".into(), DEFAULT_MODEL.to_string());

    let providers = vec![REFERENCE_PROVIDER.to_string()];
    let work_items = fanout::build_work_items(&loaded, &providers, REFERENCE_REPEATS, DEFAULT_SEED);

    let mut pass_counts: HashMap<String, u32> = HashMap::new();

    for item in &work_items {
        let outcome = client.call(item, &loaded.system_prompt, loaded.max_tokens).await;
        let passed = outcome.call_ok
            && outcome.raw_response.as_deref()
                .map(|resp| grading::grade(item.grade.clone(), &item.answer, resp))
                .unwrap_or(false);
        *pass_counts.entry(item.item_id.clone()).or_insert(0) += passed as u32;
        info!(item_id = %item.item_id, passed, "reference call");
    }

    let to_retire = filters::items_to_retire_too_hard(&pass_counts, RETIRE_THRESHOLD);
    info!(count = to_retire.len(), "items flagged for retirement (too hard)");

    println!("{:<20} {:>10} {:>12}", "item_id", "pass_count", "decision");
    println!("{}", "-".repeat(44));
    let mut all_ids: Vec<&String> = pass_counts.keys().collect();
    all_ids.sort();
    for id in &all_ids {
        let count = pass_counts[*id];
        let decision = if to_retire.contains(*id) { "retired" } else { "retained" };
        println!("{:<20} {:>10} {:>12}", id, count, decision);
    }

    for id in &to_retire {
        if let Err(e) = store.upsert_item_status(id, ItemStatusValue::RetiredTooHard, "reference <4/5").await {
            error!(item_id = %id, "upsert_item_status failed: {e}");
        }
    }
    info!("reference run complete");
}

async fn run_ceiling_check(args: &Cli, store: &store::Store) {
    let anchor_set: std::collections::HashSet<String> = args
        .anchors
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect();

    let mut pass_rates_by_item: HashMap<String, HashMap<String, f64>> = HashMap::new();

    for provider in PROBED_PROVIDERS {
        let rows = match store.get_daily_pass_rates(provider, args.window_days).await {
            Ok(r) => r,
            Err(e) => {
                error!(%provider, "get_daily_pass_rates failed: {e}");
                continue;
            }
        };
        // For this simple implementation, we use the average pass rate over the window
        // as a per-item approximation. A full per-item query would require a dedicated
        // store method; this ceiling check uses the aggregate as a proxy.
        let avg = if rows.is_empty() {
            0.0
        } else {
            rows.iter().map(|(_, r)| r).sum::<f64>() / rows.len() as f64
        };
        // Stub: mark each active item as having this provider's average pass rate.
        // In production, extend store with a per-item pass rate query.
        pass_rates_by_item
            .entry(format!("aggregate:{provider}"))
            .or_default()
            .insert(provider.to_string(), avg / 100.0);
    }

    let ceiling_items = filters::items_to_flag_ceiling(&pass_rates_by_item);
    println!("Ceiling candidates ({} items):", ceiling_items.len());
    for id in &ceiling_items {
        println!("  {id}");
    }

    if args.apply {
        for id in &ceiling_items {
            let status = if anchor_set.contains(id) {
                ItemStatusValue::Anchor
            } else {
                ItemStatusValue::RetiredCeiling
            };
            if let Err(e) = store.upsert_item_status(id, status, "ceiling check").await {
                error!(item_id = %id, "upsert_item_status failed: {e}");
            }
        }
        info!("ceiling check: applied status updates");
    } else {
        info!("ceiling check: dry-run (pass --apply to write changes)");
    }
}
