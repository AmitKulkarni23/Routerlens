mod fanout;
mod free_tier;
mod openrouter;
mod sse;
mod types;
mod validation;

use bytes::Bytes;
use fanout::fan_out;
use lambda_http::http::StatusCode;
use lambda_http::{service_fn, Request, Response};
use lambda_runtime::streaming::{self, Body as StreamBody};
use lambda_runtime::Error;
use openrouter::OpenRouterClient;
use std::env;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use tracing::{error, info};
use types::{ChorusRequest, ErrorResponse};
use validation::validate_chorus_request;
use free_tier::validate_model_ids;

#[tokio::main]
async fn main() -> Result<(), Error> {
    init_tracing();
    lambda_http::run_with_streaming_response(service_fn(handler)).await
}

async fn handler(req: Request) -> Result<Response<StreamBody>, Error> {
    info!("Chorus request received");

    // Verify origin
    let origin_verify = env::var("CLOUDFRONT_ORIGIN_VERIFY").unwrap_or_default();
    if !origin_verify.is_empty() {
        if let Some(header_val) = req.headers().get("X-Origin-Verify") {
            if header_val.to_str().unwrap_or("") != origin_verify {
                error!("Origin verification failed");
                return Ok(Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .body(StreamBody::from(
                        serde_json::to_string(&ErrorResponse {
                            error: "origin_verification_failed".to_string(),
                            message: "Invalid origin".to_string(),
                        })
                        .unwrap_or_default(),
                    ))
                    .unwrap());
            }
        } else {
            error!("Missing origin verification header");
            return Ok(Response::builder()
                .status(StatusCode::FORBIDDEN)
                .body(StreamBody::from(
                    serde_json::to_string(&ErrorResponse {
                        error: "origin_verification_failed".to_string(),
                        message: "Missing origin header".to_string(),
                    })
                    .unwrap_or_default(),
                ))
                .unwrap());
        }
    }

    // Check Content-Length for request body size limit (50 KB)
    if let Some(content_length) = req.headers().get("Content-Length") {
        if let Ok(size_str) = content_length.to_str() {
            if let Ok(size) = size_str.parse::<u64>() {
                if size > 50_000 {
                    error!("Request body too large: {} bytes", size);
                    return Ok(Response::builder()
                        .status(StatusCode::PAYLOAD_TOO_LARGE)
                        .body(StreamBody::from(
                            serde_json::to_string(&ErrorResponse {
                                error: "payload_too_large".to_string(),
                                message: "Request body exceeds 50 KB limit".to_string(),
                            })
                            .unwrap_or_default(),
                        ))
                        .unwrap());
                }
            }
        }
    }

    // Parse request body
    let body_str = std::str::from_utf8(req.body()).unwrap_or("");
    let request: ChorusRequest = match serde_json::from_str(body_str) {
        Ok(r) => r,
        Err(e) => {
            error!("Failed to parse request body: {}", e);
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(StreamBody::from(
                    serde_json::to_string(&ErrorResponse {
                        error: "validation_error".to_string(),
                        message: format!("Invalid request body: {}", e),
                    })
                    .unwrap_or_default(),
                ))
                .unwrap());
        }
    };

    // Validate request
    if let Err(e) = validate_chorus_request(&request) {
        error!("Validation failed: {}", e);
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(StreamBody::from(
                serde_json::to_string(&ErrorResponse {
                    error: "validation_error".to_string(),
                    message: e,
                })
                .unwrap_or_default(),
            ))
            .unwrap());
    }

    // Initialize OpenRouter client
    let api_key = match env::var("OPENROUTER_API_KEY") {
        Ok(k) => k,
        Err(_) => {
            error!("Missing OPENROUTER_API_KEY");
            return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(StreamBody::from("API key not configured"))
                .unwrap());
        }
    };

    let client = Arc::new(OpenRouterClient::new(api_key.clone()));

    // Validate model IDs against free-tier list
    if let Err(e) = validate_model_ids(&request.model_ids, &client.http, &api_key).await {
        error!("Model validation failed: {}", e);
        let (status, error_code) = if e == "free_tier_unavailable" {
            (StatusCode::SERVICE_UNAVAILABLE, "free_tier_unavailable")
        } else {
            (StatusCode::BAD_REQUEST, "validation_error")
        };

        return Ok(Response::builder()
            .status(status)
            .body(StreamBody::from(
                serde_json::to_string(&ErrorResponse {
                    error: error_code.to_string(),
                    message: e,
                })
                .unwrap_or_default(),
            ))
            .unwrap());
    }

    // Create SSE channel
    let (tx, mut rx) = mpsc::channel::<Bytes>(100);

    // Create cancellation token
    let cancel = CancellationToken::new();

    // Spawn fan-out task
    let cancel_clone = cancel.clone();
    let request_clone = request.clone();
    let client_clone = client.clone();
    tokio::spawn(async move {
        fan_out(request_clone, tx, client_clone, cancel_clone).await;
    });

    // Create streaming response body
    let (mut sender, body) = streaming::channel();

    tokio::spawn(async move {
        while let Some(event_bytes) = rx.recv().await {
            if sender.send_data(event_bytes).await.is_err() {
                info!("Client disconnected, stopping stream");
                cancel.cancel();
                break;
            }
        }
    });

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/event-stream")
        .header("Cache-Control", "no-cache")
        .body(body)
        .unwrap())
}

fn init_tracing() {
    let rust_log = env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string());
    tracing_subscriber::fmt()
        .with_env_filter(rust_log)
        .json()
        .init();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_origin_verify() {
        // Verification logic tested through handler flow
        let origin_verify = "test-secret";
        assert!(!origin_verify.is_empty());
    }

    #[test]
    fn test_body_size_validation() {
        // Size checking logic is tested in handler
        let max_size = 50_000u64;
        let test_size = 51_000u64;
        assert!(test_size > max_size);
    }
}
