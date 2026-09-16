use std::collections::{HashMap, HashSet};

/// Returns item_ids whose reference pass count is below `threshold` (default: 4 out of 5).
pub fn items_to_retire_too_hard(results: &HashMap<String, u32>, threshold: u32) -> Vec<String> {
    let mut out: Vec<String> = results
        .iter()
        .filter(|(_, &count)| count < threshold)
        .map(|(id, _)| id.clone())
        .collect();
    out.sort();
    out
}

/// Returns item_ids where every probed provider (union of all providers seen in the dataset)
/// has a pass rate of exactly 1.0 for that item.
///
/// An item with fewer providers than the full dataset's provider set is excluded
/// (treated as insufficient data, not a ceiling match).
pub fn items_to_flag_ceiling(
    pass_rates_by_provider: &HashMap<String, HashMap<String, f64>>,
) -> Vec<String> {
    // Collect the union of all providers seen across all items.
    let all_providers: HashSet<&str> = pass_rates_by_provider
        .values()
        .flat_map(|inner| inner.keys().map(String::as_str))
        .collect();

    let mut out: Vec<String> = pass_rates_by_provider
        .iter()
        .filter(|(_, inner)| {
            // All providers in the full set must be present AND at 1.0.
            all_providers.iter().all(|p| inner.get(*p).copied() == Some(1.0))
        })
        .map(|(id, _)| id.clone())
        .collect();
    out.sort();
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_rates(pairs: &[(&str, f64)]) -> HashMap<String, f64> {
        pairs.iter().map(|(k, v)| (k.to_string(), *v)).collect()
    }

    #[test]
    fn items_to_retire_too_hard_given_pass_count_below_threshold_should_be_flagged() {
        let mut results = HashMap::new();
        results.insert("item-001".to_string(), 3u32);
        results.insert("item-002".to_string(), 5u32);
        let out = items_to_retire_too_hard(&results, 4);
        assert_eq!(out, vec!["item-001"]);
    }

    #[test]
    fn items_to_retire_too_hard_given_pass_count_at_threshold_should_not_be_flagged() {
        let mut results = HashMap::new();
        results.insert("item-001".to_string(), 4u32);
        let out = items_to_retire_too_hard(&results, 4);
        assert!(out.is_empty());
    }

    #[test]
    fn items_to_flag_ceiling_given_all_providers_at_100_percent_should_be_flagged() {
        let mut map: HashMap<String, HashMap<String, f64>> = HashMap::new();
        map.insert(
            "item-001".to_string(),
            make_rates(&[("groq", 1.0), ("deepinfra", 1.0), ("novita", 1.0), ("together", 1.0)]),
        );
        let out = items_to_flag_ceiling(&map);
        assert_eq!(out, vec!["item-001"]);
    }

    #[test]
    fn items_to_flag_ceiling_given_one_provider_below_100_percent_should_not_be_flagged() {
        let mut map: HashMap<String, HashMap<String, f64>> = HashMap::new();
        // Include a "reference" item with all 4 providers so the full set is known.
        map.insert(
            "anchor".to_string(),
            make_rates(&[("groq", 1.0), ("deepinfra", 1.0), ("novita", 1.0), ("together", 1.0)]),
        );
        map.insert(
            "item-001".to_string(),
            make_rates(&[("groq", 1.0), ("deepinfra", 0.95), ("novita", 1.0), ("together", 1.0)]),
        );
        let out = items_to_flag_ceiling(&map);
        assert_eq!(out, vec!["anchor"]);
    }

    #[test]
    fn items_to_flag_ceiling_given_missing_provider_data_should_not_be_flagged() {
        let mut map: HashMap<String, HashMap<String, f64>> = HashMap::new();
        // "full" item establishes the expected provider set.
        map.insert(
            "full-item".to_string(),
            make_rates(&[("groq", 1.0), ("deepinfra", 1.0), ("novita", 1.0), ("together", 1.0)]),
        );
        // Partial item: novita and together absent → not flagged.
        map.insert(
            "partial-item".to_string(),
            make_rates(&[("groq", 1.0), ("deepinfra", 1.0)]),
        );
        let out = items_to_flag_ceiling(&map);
        // Only the full item should be flagged.
        assert_eq!(out, vec!["full-item"]);
    }
}
