mod logic;

use tracing::{error, info};

const PROBED_PROVIDERS: &[&str] = &["Groq", "DeepInfra", "Novita", "Together"];
const HISTORY_DAYS: u32 = 8; // 7 history + today

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let supabase_url = match std::env::var("SUPABASE_URL") {
        Ok(u) => u,
        Err(_) => {
            error!("SUPABASE_URL not set");
            std::process::exit(1);
        }
    };
    let service_key = match std::env::var("SUPABASE_SERVICE_ROLE_KEY") {
        Ok(k) => k,
        Err(_) => {
            error!("SUPABASE_SERVICE_ROLE_KEY not set");
            std::process::exit(1);
        }
    };

    let store = store::Store::new(&supabase_url, &service_key);

    for provider in PROBED_PROVIDERS {
        let rows = match store.get_daily_pass_rates(provider, HISTORY_DAYS).await {
            Ok(r) => r,
            Err(e) => {
                error!(%provider, "get_daily_pass_rates failed: {e}");
                continue;
            }
        };

        if rows.is_empty() {
            info!(%provider, "no data");
            continue;
        }

        let (today_rate, history_rates): (f64, Vec<f64>) = {
            let today = rows.last().map(|(_, r)| *r).unwrap_or(0.0);
            let hist: Vec<f64> = rows[..rows.len().saturating_sub(1)].iter().map(|(_, r)| *r).collect();
            (today, hist)
        };

        let decision = logic::evaluate_incident(&history_rates, today_rate);
        info!(%provider, ?decision, today_rate, "evaluated");

        match decision {
            logic::IncidentDecision::Open { baseline, delta } => {
                match store.get_open_incident(provider).await {
                    Ok(Some(_)) => info!(%provider, "incident already open, skipping"),
                    Ok(None) => {
                        if let Err(e) = store
                            .insert_incident(provider, "pass_rate", baseline, today_rate, delta)
                            .await
                        {
                            error!(%provider, "insert_incident failed: {e}");
                        } else {
                            info!(%provider, "incident opened");
                        }
                    }
                    Err(e) => error!(%provider, "get_open_incident failed: {e}"),
                }
            }
            logic::IncidentDecision::ResolvesOpen => {
                match store.get_open_incident(provider).await {
                    Ok(Some(id)) => {
                        if let Err(e) = store.resolve_incident(id).await {
                            error!(%provider, "resolve_incident failed: {e}");
                        } else {
                            info!(%provider, "incident resolved");
                        }
                    }
                    Ok(None) => info!(%provider, "no open incident to resolve"),
                    Err(e) => error!(%provider, "get_open_incident failed: {e}"),
                }
            }
            logic::IncidentDecision::NoIncident => info!(%provider, "no incident"),
            logic::IncidentDecision::InsufficientHistory => info!(%provider, "insufficient history"),
        }
    }
}
