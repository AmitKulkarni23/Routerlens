use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use clap::Parser;
use tokio::sync::Semaphore;
use tracing::{error, info};

use fanout::WorkItem;
use openrouter::{CallOutcome, ErrorKind};
use store::{ItemStatusValue, NewCall, RunStatus};

const DEFAULT_SEED: u64 = 42;
const DEFAULT_CONCURRENCY: usize = 8;
const DEFAULT_PROVIDERS: &str = "groq,deepinfra,novita,together";

#[derive(Parser)]
#[command(about = "Send question bank to OpenRouter providers and record outcomes")]
struct Cli {
    #[arg(long, default_value = "../data/question_bank.json")]
    bank: PathBuf,
    /// DATABASE_URL env var used when flag is absent.
    #[arg(long, env = "DATABASE_URL")]
    database_url: String,
    #[arg(long, default_value = DEFAULT_PROVIDERS)]
    providers: String,
    /// Overrides bank's repeats_per_item when set.
    #[arg(long)]
    repeats: Option<u32>,
    #[arg(long, default_value_t = DEFAULT_SEED)]
    seed: u64,
    #[arg(long, default_value_t = DEFAULT_CONCURRENCY)]
    concurrency: usize,
    /// Skip network calls; exercise the full pipeline with synthetic outcomes.
    #[arg(long)]
    dry_run: bool,
}

/// Produce a deterministic synthetic CallOutcome without any network I/O.
fn dry_run_outcome(work_item: &WorkItem) -> CallOutcome {
    let hash: u32 = work_item.item_id.bytes().fold(0u32, |acc, b| acc.wrapping_add(b as u32));
    match hash % 3 {
        0 => CallOutcome {
            call_ok: false,
            raw_response: None,
            finish_reason: None,
            latency_ms: 100,
            cost_usd: None,
            error_kind: Some(ErrorKind::Timeout),
        },
        1 => CallOutcome {
            call_ok: true,
            raw_response: Some(work_item.answer.clone()),
            finish_reason: Some("stop".into()),
            latency_ms: 250,
            cost_usd: Some(0.000_01),
            error_kind: None,
        },
        _ => CallOutcome {
            call_ok: true,
            raw_response: Some("wrong answer".into()),
            finish_reason: Some("stop".into()),
            latency_ms: 200,
            cost_usd: Some(0.000_01),
            error_kind: None,
        },
    }
}

fn is_gradeable(status_map: &HashMap<String, ItemStatusValue>, item_id: &str) -> bool {
    match status_map.get(item_id) {
        None => true,
        Some(ItemStatusValue::Active) | Some(ItemStatusValue::Anchor) => true,
        _ => false,
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args = Cli::parse();

    let loaded = match bank::load_bank(&args.bank) {
        Ok(b) => b,
        Err(e) => {
            error!("failed to load bank: {e}");
            std::process::exit(1);
        }
    };
    info!(items = loaded.items.len(), "bank loaded");

    let providers: Vec<String> = args.providers.split(',').map(str::trim).map(String::from).collect();
    let repeats = args.repeats.unwrap_or(loaded.repeats_per_item);
    let work_items = fanout::build_work_items(&loaded, &providers, repeats, args.seed);
    info!(count = work_items.len(), "work items built");

    let store = match store::Store::connect(&args.database_url).await {
        Ok(s) => Arc::new(s),
        Err(e) => {
            error!("db connect failed: {e}");
            std::process::exit(1);
        }
    };

    let git_sha = std::env::var("GIT_SHA").ok();
    let run_id = match store.start_run(loaded.version, git_sha).await {
        Ok(id) => id,
        Err(e) => {
            error!("start_run failed: {e}");
            std::process::exit(1);
        }
    };
    info!(%run_id, "run started");

    let status_map = store.get_item_status_map().await.unwrap_or_default();
    let status_map = Arc::new(status_map);

    let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
    let client = Arc::new(openrouter::OpenRouterClient::new(
        api_key,
        "https://openrouter.ai/api/v1".into(),
    ));

    let sem = Arc::new(Semaphore::new(args.concurrency));
    let mut handles = Vec::with_capacity(work_items.len());
    let total = work_items.len();

    for work_item in work_items {
        let sem = sem.clone();
        let store = store.clone();
        let client = client.clone();
        let status_map = status_map.clone();
        let system_prompt = loaded.system_prompt.clone();
        let max_tokens = loaded.max_tokens;
        let dry_run = args.dry_run;

        let handle = tokio::spawn(async move {
            let _permit = sem.acquire().await.expect("semaphore closed");

            let outcome = if dry_run {
                dry_run_outcome(&work_item)
            } else {
                client.call(&work_item, &system_prompt, max_tokens).await
            };

            let pass = if outcome.call_ok && is_gradeable(&status_map, &work_item.item_id) {
                outcome.raw_response.as_deref().map(|resp| {
                    grading::grade(work_item.grade.clone(), &work_item.answer, resp)
                })
            } else {
                None
            };

            let new_call = NewCall {
                run_id,
                item_id: work_item.item_id.clone(),
                category: work_item.category.clone(),
                provider: work_item.provider.clone(),
                repeat_idx: work_item.repeat_idx as i32,
                call_ok: outcome.call_ok,
                pass,
                raw_response: outcome.raw_response,
                finish_reason: outcome.finish_reason,
                latency_ms: Some(outcome.latency_ms as i32),
                cost_usd: outcome.cost_usd,
                error_kind: outcome.error_kind.as_ref().map(|e| e.as_str().to_string()),
            };

            if let Err(e) = store.insert_call(new_call).await {
                error!(item_id = %work_item.item_id, "insert_call failed: {e}");
                false
            } else {
                true
            }
        });
        handles.push(handle);
    }

    let mut success_count = 0usize;
    let mut fail_count = 0usize;

    for handle in handles {
        match handle.await {
            Ok(true) => success_count += 1,
            Ok(false) => fail_count += 1,
            Err(e) => {
                error!("task panicked: {e}");
                fail_count += 1;
            }
        }
    }

    let run_status = if success_count == 0 {
        RunStatus::Failed
    } else if fail_count > 0 {
        RunStatus::Partial
    } else {
        RunStatus::Completed
    };

    if let Err(e) = store.finish_run(run_id, run_status).await {
        error!("finish_run failed: {e}");
    }

    if args.dry_run {
        println!("dry-run complete: {total} work items | {success_count} persisted | {} errors", fail_count);
    }

    info!(total, success_count, fail_count, "run complete");
}
