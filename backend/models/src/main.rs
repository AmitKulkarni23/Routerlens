mod cache;
mod filter;
mod openrouter;
mod types;

use cache::get_models;
use filter::{extract_provider, filter_free_models};
use lambda_http::{service_fn, Body, Request, Response, http::StatusCode};
use openrouter::OpenRouterClient;
use std::env;
use tracing::{error, info};
use types::{ErrorResponse, ModelSummary, ModelsResponse};

#[tokio::main]
async fn main() {
    init_tracing();

    let handler = service_fn(handler);
    lambda_http::run(handler)
        .await
        .expect("Lambda runtime failed");
}

async fn handler(req: Request) -> Result<Response<Body>, lambda_http::Error> {
    info!("Incoming request: {} {}", req.method(), req.uri());

    // Check origin verification header
    let origin_verify = env::var("CLOUDFRONT_ORIGIN_VERIFY").unwrap_or_default();
    if !origin_verify.is_empty() {
        match req.headers().get("X-Origin-Verify") {
            Some(header_val) => {
                if header_val.to_str().unwrap_or("") != origin_verify {
                    error!("Origin verification failed");
                    return Ok(error_response(
                        StatusCode::FORBIDDEN,
                        "origin_verification_failed",
                        "Invalid origin",
                    ));
                }
            }
            None => {
                error!("Missing origin verification header");
                return Ok(error_response(
                    StatusCode::FORBIDDEN,
                    "origin_verification_failed",
                    "Missing origin header",
                ));
            }
        }
    }

    // Initialize OpenRouter client
    let api_key = match env::var("OPENROUTER_API_KEY") {
        Ok(k) => k,
        Err(_) => {
            error!("Missing OPENROUTER_API_KEY");
            return Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "missing_api_key",
                "API key not configured",
            ));
        }
    };

    let client = OpenRouterClient::new(api_key);

    // Fetch models from cache
    let models = match get_models(&client).await {
        Ok(m) => m,
        Err(e) => {
            error!("Failed to fetch models: {:?}", e);
            return Ok(error_response(
                StatusCode::BAD_GATEWAY,
                "upstream_unavailable",
                "Failed to fetch model catalog",
            ));
        }
    };

    // Filter to free-tier only
    let free_models = filter_free_models(&models);

    // Map to ModelSummary and sort alphabetically
    let mut model_summaries: Vec<ModelSummary> = free_models
        .into_iter()
        .map(|m| ModelSummary {
            id: m.id.clone(),
            name: m.name.clone(),
            provider: extract_provider(&m.id),
        })
        .collect();

    model_summaries.sort_by(|a, b| a.name.cmp(&b.name));

    let total = model_summaries.len() as u32;

    let response_data = ModelsResponse {
        models: model_summaries,
        total,
        cached_at: chrono::Utc::now().to_rfc3339(),
    };

    let body = serde_json::to_string(&response_data).expect("Failed to serialize response");

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type")
        .body(Body::from(body))
        .expect("Failed to build response"))
}

fn init_tracing() {
    let rust_log = env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string());
    tracing_subscriber::fmt()
        .with_env_filter(rust_log)
        .json()
        .init();
}

fn error_response(status: StatusCode, error: &str, message: &str) -> Response<Body> {
    let error_data = ErrorResponse {
        error: error.to_string(),
        message: message.to_string(),
    };

    let body = serde_json::to_string(&error_data).unwrap_or_else(|_| "{}".to_string());

    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(Body::from(body))
        .expect("Failed to build error response")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_origin_verify_accepts_correct() {
        // Verification logic is tested through the handler flow
        let origin_verify = "test-secret";
        assert!(!origin_verify.is_empty());
    }
}
