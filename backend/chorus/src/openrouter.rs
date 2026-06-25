use crate::types::{ChatCompletionResponse, SseEvent, TokenData, ModelDoneData, ModelErrorData};
use crate::sse::event_to_sse_bytes;
use bytes::Bytes;
use futures::stream::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::mpsc::Sender;
use tokio_util::sync::CancellationToken;
use tracing::{error, info};

#[derive(Clone)]
pub struct OpenRouterClient {
    pub http: Client,
    pub api_key: String,
}

impl OpenRouterClient {
    pub fn new(api_key: String) -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .expect("Failed to create HTTP client");

        Self { http, api_key }
    }
}

pub async fn stream_model(
    model_id: String,
    prompt: String,
    tx: Sender<Bytes>,
    client: Arc<OpenRouterClient>,
    cancel: CancellationToken,
) {
    let start = Instant::now();
    let mut first_token_at: Option<Instant> = None;

    // POST to OpenRouter with stream: true
    let request_body = json!({
        "model": model_id.clone(),
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "stream": true
    });

    tokio::select! {
        _ = cancel.cancelled() => {
            info!(model_id = %model_id, "Stream cancelled before request");
            return;
        }
        _ = async {} => {}
    }

    let response = match client
        .http
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", client.api_key))
        .json(&request_body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            error!("Failed to POST to OpenRouter for {}: {}", model_id, e);
            let error_event = SseEvent::ModelError(ModelErrorData {
                model_id: model_id.clone(),
                error: format!("Failed to connect: {}", e),
                status_code: None,
            });
            let _ = tx.send(event_to_sse_bytes(&error_event)).await;
            return;
        }
    };

    let status = response.status();
    if !status.is_success() {
        error!("OpenRouter returned {} for {}", status, model_id);
        let error_event = SseEvent::ModelError(ModelErrorData {
            model_id: model_id.clone(),
            error: format!("{} {}", status.as_u16(), status.canonical_reason().unwrap_or("")),
            status_code: Some(status.as_u16()),
        });
        let _ = tx.send(event_to_sse_bytes(&error_event)).await;
        return;
    }

    // Log rate-limit headers
    if let Some(remaining) = response.headers().get("x-ratelimit-remaining") {
        if let Ok(s) = remaining.to_str() {
            info!(model_id = %model_id, ratelimit_remaining = s, "Rate limit info");
        }
    }
    if let Some(reset) = response.headers().get("x-ratelimit-reset") {
        if let Ok(s) = reset.to_str() {
            info!(model_id = %model_id, ratelimit_reset = s, "Rate limit info");
        }
    }
    if let Some(retry) = response.headers().get("retry-after") {
        if let Ok(s) = retry.to_str() {
            info!(model_id = %model_id, retry_after = s, "Rate limit info");
        }
    }

    // Stream the response body
    let mut stream = response.bytes_stream();

    loop {
        tokio::select! {
            _ = cancel.cancelled() => {
                info!(model_id = %model_id, "Stream cancelled");
                return;
            }
            chunk_result = stream.next() => {
                match chunk_result {
                    Some(Ok(chunk)) => {
                        let chunk_str = String::from_utf8_lossy(&chunk);
                        // Process lines in the chunk
                        for line in chunk_str.lines() {
                            // Skip empty lines and [DONE] markers
                            if !line.is_empty() && line != "data: [DONE]" {
                                // Strip "data: " prefix
                                if let Some(json_str) = line.strip_prefix("data: ") {
                                    match serde_json::from_str::<ChatCompletionResponse>(json_str) {
                                        Ok(response) => {
                                            if let Some(choice) = response.choices.first() {
                                                let content = &choice.delta.content;
                                                if !content.is_empty() {
                                                    // Record time-to-first-token on first non-empty content
                                                    if first_token_at.is_none() {
                                                        first_token_at = Some(Instant::now());
                                                    }

                                                    let token_event = SseEvent::Token(TokenData {
                                                        model_id: model_id.clone(),
                                                        content: content.clone(),
                                                    });

                                                    if tx.send(event_to_sse_bytes(&token_event)).await.is_err() {
                                                        info!(model_id = %model_id, "Channel closed, stopping stream");
                                                        return;
                                                    }
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            error!(model_id = %model_id, error = %e, "Failed to parse OpenRouter response chunk");
                                            // Continue reading, skip malformed chunk
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Some(Err(e)) => {
                        error!(model_id = %model_id, error = %e, "Stream error");
                        let error_event = SseEvent::ModelError(ModelErrorData {
                            model_id: model_id.clone(),
                            error: format!("Stream error: {}", e),
                            status_code: None,
                        });
                        let _ = tx.send(event_to_sse_bytes(&error_event)).await;
                        return;
                    }
                    None => {
                        // Stream ended
                        break;
                    }
                }
            }
        }
    }

    // Stream completed successfully
    let total_duration = start.elapsed().as_millis() as u64;
    let ttfb_ms = first_token_at
        .map(|fst| {
            // Calculate time-to-first-token from start of request
            fst.duration_since(start).as_millis() as u64
        })
        .unwrap_or(0);

    let done_event = SseEvent::ModelDone(ModelDoneData {
        model_id: model_id.clone(),
        ttfb_ms,
        duration_ms: total_duration,
    });

    let _ = tx.send(event_to_sse_bytes(&done_event)).await;
    info!(
        model_id = %model_id,
        ttfb_ms = ttfb_ms,
        duration_ms = total_duration,
        "Stream completed"
    );
}
