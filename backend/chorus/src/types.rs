use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct ChorusRequest {
    pub prompt: String,
    pub model_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub enum SseEvent {
    Token(TokenData),
    ModelDone(ModelDoneData),
    ModelError(ModelErrorData),
    Done,
}

#[derive(Debug, Clone, Serialize)]
pub struct TokenData {
    pub model_id: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelDoneData {
    pub model_id: String,
    pub ttfb_ms: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelErrorData {
    pub model_id: String,
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_code: Option<u16>,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpenRouterModel {
    pub id: String,
    pub pricing: OpenRouterPricing,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpenRouterPricing {
    pub prompt: String,
    pub completion: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct ModelsListResponse {
    pub data: Vec<OpenRouterModel>,
}

// OpenRouter streaming response structures
#[derive(Debug, Deserialize)]
pub struct ChatCompletionResponse {
    pub choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
pub struct Choice {
    pub delta: Delta,
}

#[derive(Debug, Deserialize)]
pub struct Delta {
    #[serde(default)]
    pub content: String,
}
