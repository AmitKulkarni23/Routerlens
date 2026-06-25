use crate::types::OpenRouterModel;

#[allow(dead_code)]
pub fn is_free_tier(model: &OpenRouterModel) -> bool {
    (model.pricing.prompt == "0" && model.pricing.completion == "0")
        || model.id.ends_with(":free")
}

#[allow(dead_code)]
pub fn extract_provider(model_id: &str) -> String {
    model_id
        .split('/')
        .next()
        .unwrap_or("unknown")
        .to_string()
}

pub fn filter_free_models(models: &[OpenRouterModel]) -> Vec<OpenRouterModel> {
    models
        .iter()
        .filter(|m| is_free_tier(m))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filter_free_models_by_pricing() {
        let model = OpenRouterModel {
            id: "google/gemma:free".to_string(),
            name: "Gemma".to_string(),
            pricing: crate::types::OpenRouterPricing {
                prompt: "0".to_string(),
                completion: "0".to_string(),
            },
        };
        assert!(is_free_tier(&model));
    }

    #[test]
    fn test_filter_free_models_by_suffix() {
        let model = OpenRouterModel {
            id: "mistral/mistral-7b:free".to_string(),
            name: "Mistral".to_string(),
            pricing: crate::types::OpenRouterPricing {
                prompt: "0.5".to_string(),
                completion: "0.5".to_string(),
            },
        };
        assert!(is_free_tier(&model));
    }

    #[test]
    fn test_filter_excludes_paid_models() {
        let model = OpenRouterModel {
            id: "openai/gpt-4".to_string(),
            name: "GPT-4".to_string(),
            pricing: crate::types::OpenRouterPricing {
                prompt: "0.03".to_string(),
                completion: "0.06".to_string(),
            },
        };
        assert!(!is_free_tier(&model));
    }

    #[test]
    fn test_provider_extraction() {
        assert_eq!(extract_provider("google/gemma-2-9b-it:free"), "google");
        assert_eq!(
            extract_provider("meta-llama/llama-3.1-8b-instruct:free"),
            "meta-llama"
        );
    }

    #[test]
    fn test_provider_extraction_no_slash() {
        assert_eq!(extract_provider("no-slash-model"), "no-slash-model");
    }
}
