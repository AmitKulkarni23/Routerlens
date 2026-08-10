# Task 06 — Grading Module

## Summary

Implement the `grading` crate: pure functions that mechanically grade a
model's raw response against an item's expected answer, for all four grade
types (`numeric`, `exact`, `exact_nospace`, `json`). This is the module the
project's neutrality claim rests on — no LLM judge, ever — and is
explicitly in scope for unit tests per project testing policy.

## Read First

- `docs/system-specs/architecture.md` §5 "Grading (mechanical only — no LLM
  judge, ever)" — the exact rule per grade type, verbatim table:
  - `numeric`: strip whitespace/commas/trailing period, parse both sides as
    f64, compare with small epsilon.
  - `exact`: trim outer whitespace, compare strings byte-equal.
  - `exact_nospace`: remove ALL whitespace from both sides, then compare.
  - `json`: strip markdown code fences if present, parse both sides as
    JSON, deep-equal.
- `docs/system-specs/architecture.md` §11 — grading edge cases explicitly
  called out for tests: fences, commas, whitespace, malformed JSON.

## Requirements

### Public API

- The crate MUST depend on the `bank` crate (Task 03) for `GradeType` — it
  MUST NOT redefine this enum.
- The crate MUST expose `pub fn grade(grade_type: bank::GradeType, expected: &str, actual: &str) -> bool`
  dispatching to one of four private grading functions by `grade_type`.

### Per-type rules

- `grade_numeric(expected, actual)` MUST strip whitespace, commas, and a
  trailing period from both strings, parse both as `f64`, and return
  `true` if `(a - b).abs() < 1e-9` (or an equivalent small epsilon named as
  a constant). MUST return `false` (not panic) if either side fails to
  parse as a number.
- `grade_exact(expected, actual)` MUST trim leading/trailing whitespace
  from both strings and return `true` only on byte-equal comparison
  (case-sensitive, no internal whitespace normalization).
- `grade_exact_nospace(expected, actual)` MUST remove every whitespace
  character (spaces, tabs, newlines) from both strings before comparing
  byte-equal.
- `grade_json(expected, actual)` MUST strip a leading/trailing markdown
  code fence from `actual` if present (` ```json ... ``` ` or ` ``` ... ``` `,
  with or without a language tag), then parse both `expected` and the
  fence-stripped `actual` as JSON and return `true` on deep structural
  equality (key order and whitespace MUST NOT affect equality; numeric
  types MUST compare by value). MUST return `false` (not panic) if either
  side fails to parse as JSON.

## TDD Plan

### RED

- `grade_numeric_given_commas_and_trailing_period_should_match` — expected `"121401"`, actual `"121,401."` → `true`.
- `grade_numeric_given_malformed_actual_should_return_false` — expected `"43"`, actual `"forty-three"` → `false`, no panic.
- `grade_exact_nospace_given_internal_whitespace_variance_should_match` — expected `"[1, 2, 3]"`, actual `"[1,2,3]"` → `true`.
- `grade_json_given_markdown_fence_and_key_order_variance_should_match` — expected `{"a":1,"b":2}`, actual `` ```json\n{"b": 2, "a": 1}\n``` `` → `true`.
- `grade_json_given_malformed_json_should_return_false` — expected `{"status":"ok"}`, actual `"{status: ok"` (invalid JSON) → `false`, no panic.

### GREEN

1. Add `bank` as a path dependency in `prober/crates/grading/Cargo.toml`;
   add `serde_json`.
2. Implement `grade_numeric` in `prober/crates/grading/src/lib.rs`.
3. Implement `grade_exact` and `grade_exact_nospace`.
4. Implement `grade_json`, including the fence-stripping helper.
5. Implement the public `grade` dispatch function.
6. Run the five RED tests, confirm all pass.

### REFACTOR

Extract the markdown-fence-stripping logic into a named private helper
(`strip_code_fence`) if inlined in `grade_json` for clarity. No behavior
change.

## Dependencies

Task 01 (repo scaffolding), Task 03 (bank crate — provides `GradeType`).

## Files to Create/Modify

- `prober/crates/grading/src/lib.rs` (modify — implement `grade` and the four per-type functions, plus the five unit tests)
- `prober/crates/grading/Cargo.toml` (modify — add `bank` path dependency and `serde_json`)

## Acceptance Criteria

- All RED tests written and failing for the right reason (unimplemented `grade` functions).
- All tests GREEN with minimal implementation.
- REFACTOR pass complete, no regressions.
- All five RED tests pass; no grading function panics on malformed input for any grade type.
- `cargo test -p grading` passes with zero warnings.

## Spec Updates

None.
