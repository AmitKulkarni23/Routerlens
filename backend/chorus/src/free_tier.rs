use crate::types::{OpenRouterModel, ModelsListResponse};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{debug, error, info};

static FREE_TIER_CACHE: OnceLock<RwLock<FreeTierCache>> = OnceLock::new();
static REFRESH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

#[derive(Clone)]
pub struct FreeTierCache {
    model_ids: HashSet<String>,
    fetched_at: Option<Instant>,
    ttl: Duration,
}

impl FreeTierCache {
    pub fn new() -> Self {
        Self {
            model_ids: HashSet::new(),
            fetched_at: None,
            ttl: Duration::from_secs(60), // 60 seconds
        }
    }

    fn is_fresh(&self) -> bool {
        match self.fetched_at {
            None => false,
            Some(fetched) => fetched.elapsed() < self.ttl,
        }
    }

    fn refresh(&mut self, model_ids: HashSet<String>) {
        self.model_ids = model_ids;
        self.fetched_at = Some(Instant::now());
        info!("Free-tier cache refreshed with {} models", self.model_ids.len());
    }

    fn models(&self) -> HashSet<String> {
        self.model_ids.clone()
    }

    fn has_data(&self) -> bool {
        !self.model_ids.is_empty()
    }
}

pub async fn validate_model_ids(
    model_ids: &[String],
    http_client: &reqwest::Client,
    api_key: &str,
) -> Result<(), String> {
    let free_tier_set = fetch_free_tier_models(http_client, api_key).await?;

    for model_id in model_ids {
        if !free_tier_set.contains(model_id) {
            return Err(format!("model not available: {}", model_id));
        }
    }

    Ok(())
}

async fn fetch_free_tier_models(
    http_client: &reqwest::Client,
    api_key: &str,
) -> Result<HashSet<String>, String> {
    let cache = FREE_TIER_CACHE.get_or_init(|| RwLock::new(FreeTierCache::new()));

    // Check read lock for fresh data
    {
        let read = cache.read().await;
        if read.is_fresh() {
            debug!("Free-tier cache hit");
            return Ok(read.models());
        }

        // If stale but has data, serve stale and spawn background refresh
        if read.has_data() {
            let stale_data = read.models();
            let should_refresh = !REFRESH_IN_PROGRESS.swap(true, Ordering::SeqCst);

            if should_refresh {
                let http_client = http_client.clone();
                let api_key = api_key.to_string();
                tokio::spawn(async move {
                    if let Ok(models) = fetch_models_from_openrouter(&http_client, &api_key).await {
                        let cache = FREE_TIER_CACHE.get_or_init(|| RwLock::new(FreeTierCache::new()));
                        let mut cache_mut = cache.write().await;
                        let free_set = extract_free_tier(&models);
                        cache_mut.refresh(free_set);
                    }
                    REFRESH_IN_PROGRESS.store(false, Ordering::SeqCst);
                });
            }

            return Ok(stale_data);
        }
    }

    // Cache is empty: block on fetch
    let models = fetch_models_from_openrouter(http_client, api_key)
        .await
        .map_err(|_| "free_tier_unavailable")?;

    let free_set = extract_free_tier(&models);

    let mut write = cache.write().await;
    write.refresh(free_set.clone());

    Ok(free_set)
}

async fn fetch_models_from_openrouter(
    http_client: &reqwest::Client,
    api_key: &str,
) -> Result<Vec<OpenRouterModel>, String> {
    let url = "https://openrouter.ai/api/v1/models";

    let response = tokio::time::timeout(
        Duration::from_secs(5),
        http_client
            .get(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send(),
    )
    .await
    .map_err(|_| "free_tier_fetch_timeout".to_string())?
    .map_err(|e| {
        error!("Failed to fetch free-tier models: {}", e);
        format!("fetch_error: {}", e)
    })?;

    if !response.status().is_success() {
        error!("OpenRouter /models returned {}", response.status());
        return Err("upstream_error".to_string());
    }

    let data: ModelsListResponse = response
        .json()
        .await
        .map_err(|e| {
            error!("Failed to parse OpenRouter response: {}", e);
            format!("parse_error: {}", e)
        })?;

    Ok(data.data)
}

fn extract_free_tier(models: &[OpenRouterModel]) -> HashSet<String> {
    models
        .iter()
        .filter(|m| {
            (m.pricing.prompt == "0" && m.pricing.completion == "0") || m.id.ends_with(":free")
        })
        .map(|m| m.id.clone())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_free_tier_cache_structure() {
        let cache = FreeTierCache::new();
        assert!(!cache.is_fresh());
        assert!(!cache.has_data());
    }

    #[test]
    fn test_extract_free_tier() {
        let models = vec![
            OpenRouterModel {
                id: "google/gemma:free".to_string(),
                pricing: crate::types::OpenRouterPricing {
                    prompt: "0".to_string(),
                    completion: "0".to_string(),
                },
            },
            OpenRouterModel {
                id: "mistral/mistral:free".to_string(),
                pricing: crate::types::OpenRouterPricing {
                    prompt: "0.1".to_string(),
                    completion: "0.1".to_string(),
                },
            },
        ];

        let free_set = extract_free_tier(&models);
        assert!(free_set.contains("google/gemma:free"));
        assert!(free_set.contains("mistral/mistral:free"));
    }
}
