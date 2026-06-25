use crate::types::SseEvent;
use bytes::Bytes;

pub fn event_to_sse_bytes(event: &SseEvent) -> Bytes {
    let (event_name, data_str) = match event {
        SseEvent::Token(d) => ("token", serde_json::to_string(d).unwrap()),
        SseEvent::ModelDone(d) => ("model_done", serde_json::to_string(d).unwrap()),
        SseEvent::ModelError(d) => ("model_error", serde_json::to_string(d).unwrap()),
        SseEvent::Done => ("done", "{}".to_string()),
    };

    Bytes::from(format!("event: {}\ndata: {}\n\n", event_name, data_str))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{TokenData, ModelDoneData};

    #[test]
    fn test_sse_token_event_format() {
        let event = SseEvent::Token(TokenData {
            model_id: "google/gemma-2-9b-it:free".to_string(),
            content: "Hello".to_string(),
        });
        let bytes = event_to_sse_bytes(&event);
        let s = String::from_utf8(bytes.to_vec()).unwrap();
        assert!(s.contains("event: token"));
        assert!(s.contains("google/gemma-2-9b-it:free"));
        assert!(s.contains("Hello"));
    }

    #[test]
    fn test_sse_done_event_format() {
        let event = SseEvent::Done;
        let bytes = event_to_sse_bytes(&event);
        let s = String::from_utf8(bytes.to_vec()).unwrap();
        assert_eq!(s, "event: done\ndata: {}\n\n");
    }

    #[test]
    fn test_sse_model_done_event() {
        let event = SseEvent::ModelDone(ModelDoneData {
            model_id: "google/gemma-2-9b-it:free".to_string(),
            ttfb_ms: 340,
            duration_ms: 2100,
        });
        let bytes = event_to_sse_bytes(&event);
        let s = String::from_utf8(bytes.to_vec()).unwrap();
        assert!(s.contains("event: model_done"));
        assert!(s.contains("340"));
        assert!(s.contains("2100"));
    }
}
