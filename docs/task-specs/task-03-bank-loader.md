# Task 03 — Question Bank Loader and Validation

## Summary

Implement the `bank` crate: parses `data/question_bank.json` into typed Rust
structs and validates it against the schema documented in the architecture
spec (unique IDs, valid grade types, valid difficulty values, non-empty
prompts/answers). This crate is the single source of the `GradeType` enum
and `Item`/`Bank` types that the fan-out builder (Task 04) and grading
module (Task 06) both depend on.

## Read First

- `docs/system-specs/architecture.md` §5 (Question bank format) — the exact
  JSON shape, field names, and enum values (`grade`: numeric | exact |
  exact_nospace | json; `difficulty`: easy | medium | hard) to model.
- `data/question_bank.json` — the real file this crate parses; treat its
  current shape (80 items, 10 categories, `version`, `system_prompt`,
  `max_tokens`, `repeats_per_item` top-level fields) as the contract.

## Requirements

### Types and parsing

- The crate MUST expose a public `Bank` struct with fields `version: u32`,
  `system_prompt: String`, `max_tokens: u32`, `repeats_per_item: u32`,
  `items: Vec<Item>`, deriving `serde::Deserialize`.
- The crate MUST expose a public `Item` struct with fields `id: String`,
  `category: String`, `difficulty: Difficulty`, `prompt: String`,
  `answer: String`, `grade: GradeType`, deriving `serde::Deserialize`.
- The crate MUST expose public enums `Difficulty { Easy, Medium, Hard }` and
  `GradeType { Numeric, Exact, ExactNospace, Json }` with serde rename
  attributes matching the lowercase/snake_case JSON values
  (`exact_nospace`, etc.).
- The crate MUST expose `pub fn load_bank(path: &Path) -> Result<Bank, BankError>`
  that reads the file, deserializes it, and runs validation (below) before
  returning.
- `BankError` MUST be a `thiserror`-derived enum distinguishing at minimum:
  `Io(std::io::Error)`, `Parse(serde_json::Error)`, `Validation(String)`.

### Validation rules

- `load_bank` MUST return `Err(BankError::Validation(_))` if any two items
  share the same `id`.
- `load_bank` MUST return `Err(BankError::Validation(_))` if `items` is
  empty.
- `load_bank` MUST return `Err(BankError::Validation(_))` if any item has
  an empty `prompt` or empty `answer` string.
- `load_bank` MUST succeed (return `Ok`) for a well-formed bank matching
  the real `data/question_bank.json` shape.
- Unknown/malformed `grade` or `difficulty` string values MUST surface as
  `BankError::Parse` (serde deserialization failure), not silently
  default to a variant.

## TDD Plan

N/A — bank loading/validation is glue and I/O, not one of the four
categories (grading, fan-out, calibration filtering, incident detection)
the project testing policy (architecture.md §11) scopes unit tests to.
Verify correctness by running `load_bank` against the real
`data/question_bank.json` in a `fn main()` smoke check or via `cargo run`
in a later task (Task 08's `--dry-run` mode exercises this path).

## Dependencies

Task 01 (repo scaffolding — `prober/crates/bank` stub must exist).

## Files to Create/Modify

- `prober/crates/bank/src/lib.rs` (modify — implement `Bank`, `Item`, `Difficulty`, `GradeType`, `BankError`, `load_bank`)
- `prober/crates/bank/Cargo.toml` (modify — add `serde`, `serde_json`, `thiserror` dependencies via workspace)

## Acceptance Criteria

- All RED tests written and failing for the right reason: N/A, no tests in this task.
- All tests GREEN with minimal implementation: N/A.
- REFACTOR pass complete, no regressions: N/A.
- `load_bank(Path::new("../../data/question_bank.json"))` (relative path
  from the crate) returns `Ok(Bank)` with `items.len() == 80` when run
  manually or via a `#[cfg(test)]` smoke check the implementer may add for
  their own sanity (not counted against the no-test policy since it does
  not test business logic, merely confirms the fixture loads — implementer
  MAY omit this if they prefer to verify via Task 08 dry-run instead).
- Duplicate-ID and empty-answer malformed fixtures (constructed inline,
  not committed as files) are rejected with `BankError::Validation`.
- `cargo build -p bank` compiles with no warnings.

## Spec Updates

None.
