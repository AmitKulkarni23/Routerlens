//! Question bank: loading and validating the question bank JSON (task 03).

use std::collections::HashSet;
use std::path::Path;

use serde::Deserialize;
use thiserror::Error;

#[derive(Debug, Deserialize)]
pub struct Bank {
    pub version: u32,
    pub system_prompt: String,
    pub max_tokens: u32,
    pub repeats_per_item: u32,
    pub items: Vec<Item>,
}

#[derive(Debug, Deserialize)]
pub struct Item {
    pub id: String,
    pub category: String,
    pub difficulty: Difficulty,
    pub prompt: String,
    pub answer: String,
    pub grade: GradeType,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GradeType {
    Numeric,
    Exact,
    ExactNospace,
    Json,
}

#[derive(Debug, Error)]
pub enum BankError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("parse: {0}")]
    Parse(#[from] serde_json::Error),
    #[error("validation: {0}")]
    Validation(String),
}

pub fn load_bank(path: &Path) -> Result<Bank, BankError> {
    let data = std::fs::read_to_string(path)?;
    let bank: Bank = serde_json::from_str(&data)?;

    if bank.items.is_empty() {
        return Err(BankError::Validation("items list is empty".into()));
    }

    let mut seen = HashSet::new();
    for item in &bank.items {
        if item.prompt.is_empty() {
            return Err(BankError::Validation(format!("item {} has empty prompt", item.id)));
        }
        if item.answer.is_empty() {
            return Err(BankError::Validation(format!("item {} has empty answer", item.id)));
        }
        if !seen.insert(item.id.clone()) {
            return Err(BankError::Validation(format!("duplicate item id: {}", item.id)));
        }
    }

    Ok(bank)
}
