//! OpenRouter HTTP client and CallOutcome capture (task 05).

use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

const MODEL: &str = "meta-llama/llama-3.3-70b-instruct";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const RATE_LIMIT_RETRY_DELAY: Duration = Duration::from_secs(2);

#[derive(Debug, Clone)]
pub struct OpenRouterClient {
    api_key: String,
    base_url: String,
    http: reqwest::Client,
}

impl OpenRouterClient {
    pub fn new(api_key: String, base_url: String) -> Self {
        let http = reqwest::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("failed to build reqwest client");
        Self { api_key, base_url, http }
    }
}

#[derive(Debug, Clone)]
pub struct CallOutcome {
    pub call_ok: bool,
    pub raw_response: Option<String>,
    pub finish_reason: Option<String>,
    pub latency_ms: i64,
    pub cost_usd: Option<f64>,
    pub error_kind: Option<ErrorKind>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorKind {
    Timeout,
    Http4xx,
    Http5xx,
    RateLimited,
    MalformedResponse,
}

impl ErrorKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Timeout => "timeout",
            Self::Http4xx => "http_4xx",
            Self::Http5xx => "http_5xx",
            Self::RateLimited => "rate_limited",
            Self::MalformedResponse => "malformed_response",
        }
    }
}

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'static str,
    messages: Vec<Message<'a>>,
    max_tokens: u32,
    stream: bool,
    provider: ProviderConstraint<'a>,
}

#[derive(Serialize)]
struct Message<'a> {
    role: &'static str,
    content: &'a str,
}

#[derive(Serialize)]
struct ProviderConstraint<'a> {
    order: Vec<&'a str>,
    allow_fallbacks: bool,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Option<Vec<Choice>>,
    usage: Option<UsageInfo>,
}

#[derive(Deserialize)]
struct Choice {
    message: Option<ChoiceMessage>,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct ChoiceMessage {
    content: Option<String>,
}

#[derive(Deserialize)]
struct UsageInfo {
    cost: Option<f64>,
}

impl OpenRouterClient {
    pub async fn call(
        &self,
        work_item: &fanout::WorkItem,
        system_prompt: &str,
        max_tokens: u32,
    ) -> CallOutcome {
        let body = ChatRequest {
            model: MODEL,
            messages: vec![
                Message { role: "system", content: system_prompt },
                Message { role: "user", content: &work_item.prompt },
            ],
            max_tokens,
            stream: false,
            provider: ProviderConstraint {
                order: vec![&work_item.provider],
                allow_fallbacks: false,
            },
        };

        let start = Instant::now();
        let outcome = self.attempt(&body).await;

        // Single bounded retry on 429.
        let outcome = if matches!(outcome.error_kind, Some(ErrorKind::RateLimited)) {
            tokio::time::sleep(RATE_LIMIT_RETRY_DELAY).await;
            self.attempt(&body).await
        } else {
            outcome
        };

        // Override latency to cover the full wall-clock span including any retry.
        CallOutcome {
            latency_ms: start.elapsed().as_millis() as i64,
            ..outcome
        }
    }

    async fn attempt(&self, body: &ChatRequest<'_>) -> CallOutcome {
        let start = Instant::now();

        let result = self
            .http
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(body)
            .send()
            .await;

        let latency_ms = start.elapsed().as_millis() as i64;

        let response = match result {
            Err(e) if e.is_timeout() => {
                return CallOutcome {
                    call_ok: false,
                    raw_response: None,
                    finish_reason: None,
                    latency_ms,
                    cost_usd: None,
                    error_kind: Some(ErrorKind::Timeout),
                };
            }
            Err(_) => {
                return CallOutcome {
                    call_ok: false,
                    raw_response: None,
                    finish_reason: None,
                    latency_ms,
                    cost_usd: None,
                    error_kind: Some(ErrorKind::Http5xx),
                };
            }
            Ok(r) => r,
        };

        let status = response.status();

        if status.as_u16() == 429 {
            return CallOutcome {
                call_ok: false,
                raw_response: None,
                finish_reason: None,
                latency_ms,
                cost_usd: None,
                error_kind: Some(ErrorKind::RateLimited),
            };
        }
        if status.is_client_error() {
            return CallOutcome {
                call_ok: false,
                raw_response: None,
                finish_reason: None,
                latency_ms,
                cost_usd: None,
                error_kind: Some(ErrorKind::Http4xx),
            };
        }
        if status.is_server_error() {
            return CallOutcome {
                call_ok: false,
                raw_response: None,
                finish_reason: None,
                latency_ms,
                cost_usd: None,
                error_kind: Some(ErrorKind::Http5xx),
            };
        }

        let body_text = match response.text().await {
            Err(_) => {
                return CallOutcome {
                    call_ok: false,
                    raw_response: None,
                    finish_reason: None,
                    latency_ms,
                    cost_usd: None,
                    error_kind: Some(ErrorKind::MalformedResponse),
                };
            }
            Ok(t) => t,
        };

        let parsed: ChatResponse = match serde_json::from_str(&body_text) {
            Err(_) => {
                return CallOutcome {
                    call_ok: false,
                    raw_response: Some(body_text),
                    finish_reason: None,
                    latency_ms,
                    cost_usd: None,
                    error_kind: Some(ErrorKind::MalformedResponse),
                };
            }
            Ok(p) => p,
        };

        let choices = match parsed.choices {
            Some(c) if !c.is_empty() => c,
            _ => {
                return CallOutcome {
                    call_ok: false,
                    raw_response: Some(body_text),
                    finish_reason: None,
                    latency_ms,
                    cost_usd: None,
                    error_kind: Some(ErrorKind::MalformedResponse),
                };
            }
        };

        let first = &choices[0];
        let content = first.message.as_ref().and_then(|m| m.content.clone());
        let finish_reason = first.finish_reason.clone();
        let cost_usd = parsed.usage.and_then(|u| u.cost);

        CallOutcome {
            call_ok: true,
            raw_response: content,
            finish_reason,
            latency_ms,
            cost_usd,
            error_kind: None,
        }
    }
}
