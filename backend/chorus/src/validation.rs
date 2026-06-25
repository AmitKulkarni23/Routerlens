use crate::types::ChorusRequest;

pub fn validate_chorus_request(req: &ChorusRequest) -> Result<(), String> {
    // Validate prompt
    if req.prompt.trim().is_empty() {
        return Err("prompt must not be empty".to_string());
    }

    if req.prompt.len() > 2000 {
        return Err("prompt must be 2000 characters or fewer".to_string());
    }

    // Validate model count
    if req.model_ids.len() < 2 {
        return Err("select at least 2 models".to_string());
    }

    if req.model_ids.len() > 6 {
        return Err("select at most 6 models".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_empty_prompt() {
        let req = ChorusRequest {
            prompt: "   ".to_string(),
            model_ids: vec!["model1".to_string(), "model2".to_string()],
        };
        assert!(validate_chorus_request(&req).is_err());
    }

    #[test]
    fn test_validate_prompt_too_long() {
        let req = ChorusRequest {
            prompt: "a".repeat(2001),
            model_ids: vec!["model1".to_string(), "model2".to_string()],
        };
        assert!(validate_chorus_request(&req).is_err());
    }

    #[test]
    fn test_validate_prompt_at_limit() {
        let req = ChorusRequest {
            prompt: "a".repeat(2000),
            model_ids: vec!["model1".to_string(), "model2".to_string()],
        };
        assert!(validate_chorus_request(&req).is_ok());
    }

    #[test]
    fn test_validate_too_few_models() {
        let req = ChorusRequest {
            prompt: "test".to_string(),
            model_ids: vec!["model1".to_string()],
        };
        assert!(validate_chorus_request(&req).is_err());
    }

    #[test]
    fn test_validate_too_many_models() {
        let req = ChorusRequest {
            prompt: "test".to_string(),
            model_ids: vec![
                "model1".to_string(),
                "model2".to_string(),
                "model3".to_string(),
                "model4".to_string(),
                "model5".to_string(),
                "model6".to_string(),
                "model7".to_string(),
            ],
        };
        assert!(validate_chorus_request(&req).is_err());
    }

    #[test]
    fn test_validate_bounds() {
        let req_2 = ChorusRequest {
            prompt: "test".to_string(),
            model_ids: vec!["model1".to_string(), "model2".to_string()],
        };
        assert!(validate_chorus_request(&req_2).is_ok());

        let req_6 = ChorusRequest {
            prompt: "test".to_string(),
            model_ids: vec![
                "model1".to_string(),
                "model2".to_string(),
                "model3".to_string(),
                "model4".to_string(),
                "model5".to_string(),
                "model6".to_string(),
            ],
        };
        assert!(validate_chorus_request(&req_6).is_ok());
    }
}
