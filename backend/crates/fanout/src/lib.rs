//! Work-item fan-out: building provider × item × repeat work items (task 04).

use rand::rngs::StdRng;
use rand::{SeedableRng, seq::SliceRandom};

pub use bank::GradeType;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkItem {
    pub item_id: String,
    pub category: String,
    pub provider: String,
    pub repeat_idx: u32,
    pub prompt: String,
    pub answer: String,
    pub grade: GradeType,
}

pub fn build_work_items(
    bank: &bank::Bank,
    providers: &[String],
    repeats: u32,
    seed: u64,
) -> Vec<WorkItem> {
    let mut items: Vec<WorkItem> = bank
        .items
        .iter()
        .flat_map(|item| {
            providers.iter().flat_map(move |provider| {
                (0..repeats).map(move |repeat_idx| WorkItem {
                    item_id: item.id.clone(),
                    category: item.category.clone(),
                    provider: provider.clone(),
                    repeat_idx,
                    prompt: item.prompt.clone(),
                    answer: item.answer.clone(),
                    grade: item.grade.clone(),
                })
            })
        })
        .collect();

    let mut rng = StdRng::seed_from_u64(seed);
    items.shuffle(&mut rng);
    items
}

#[cfg(test)]
mod tests {
    use super::*;
    use bank::{Bank, Difficulty, GradeType, Item};

    fn make_bank(n: usize) -> Bank {
        Bank {
            version: 1,
            system_prompt: "test".into(),
            max_tokens: 100,
            repeats_per_item: 3,
            items: (0..n)
                .map(|i| Item {
                    id: format!("item-{i:03}"),
                    category: "test".into(),
                    difficulty: Difficulty::Easy,
                    prompt: "prompt".into(),
                    answer: "answer".into(),
                    grade: GradeType::Exact,
                })
                .collect(),
        }
    }

    fn providers(names: &[&str]) -> Vec<String> {
        names.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn build_work_items_given_bank_and_providers_should_produce_full_cartesian_product() {
        let bank = make_bank(2);
        let pvs = providers(&["groq", "deepinfra"]);
        let out = build_work_items(&bank, &pvs, 3, 42);
        assert_eq!(out.len(), 12);

        let mut triples: Vec<(String, String, u32)> = out
            .iter()
            .map(|w| (w.item_id.clone(), w.provider.clone(), w.repeat_idx))
            .collect();
        triples.sort();

        let mut expected: Vec<(String, String, u32)> = (0..2)
            .flat_map(|i| {
                pvs.iter().flat_map(move |p| {
                    (0..3u32).map(move |r| (format!("item-{i:03}"), p.clone(), r))
                })
            })
            .collect();
        expected.sort();

        assert_eq!(triples, expected);
    }

    #[test]
    fn build_work_items_given_same_seed_should_produce_identical_order() {
        let bank = make_bank(5);
        let pvs = providers(&["groq", "deepinfra"]);
        let a = build_work_items(&bank, &pvs, 3, 42);
        let b = build_work_items(&bank, &pvs, 3, 42);
        assert_eq!(a, b);
    }

    #[test]
    fn build_work_items_given_different_seeds_should_produce_different_order() {
        let bank = make_bank(5);
        let pvs = providers(&["groq", "deepinfra"]);
        let a = build_work_items(&bank, &pvs, 3, 1);
        let b = build_work_items(&bank, &pvs, 3, 2);
        assert_ne!(a, b);
    }

    #[test]
    fn build_work_items_given_empty_providers_should_produce_empty_output() {
        let bank = make_bank(3);
        let out = build_work_items(&bank, &[], 3, 42);
        assert_eq!(out.len(), 0);
    }
}
