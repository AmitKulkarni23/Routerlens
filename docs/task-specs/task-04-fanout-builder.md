# Task 04 — Work-Item Fan-Out Builder

## Summary

Implement the `fanout` crate: expands a loaded `Bank` into the flat list of
`WorkItem`s the prober executes — one per `(item, provider, repeat)`
combination — shuffled deterministically under a caller-supplied seed so
runs are reproducible for debugging while still avoiding provider-clustered
call ordering. This is one of the four modules explicitly in scope for unit
tests per project testing policy.

## Read First

- `docs/system-specs/architecture.md` §3 (Probe configuration) — fan-out
  math: 80 items × 4 providers × 3 repeats = 960 calls; the probed provider
  list (Groq, DeepInfra, Novita, Together).
- `docs/system-specs/architecture.md` §4 (Pipeline) — "build work items
  (item × provider × repeat), shuffled" is the exact responsibility of this
  crate; grading and HTTP calls happen downstream, not here.
- `docs/system-specs/architecture.md` §11 (Testing policy) — fan-out
  (counts, shuffling determinism under seed) is explicitly in scope for
  unit tests.

## Requirements

### WorkItem construction

- The crate MUST expose `pub struct WorkItem { pub item_id: String, pub category: String, pub provider: String, pub repeat_idx: u32, pub prompt: String, pub answer: String, pub grade: bank::GradeType }`.
- The crate MUST depend on the `bank` crate (Task 03) for `Bank`, `Item`,
  `GradeType` — it MUST NOT redefine these types.
- The crate MUST expose `pub fn build_work_items(bank: &bank::Bank, providers: &[String], repeats: u32, seed: u64) -> Vec<WorkItem>`.
- For every item in `bank.items` and every provider in `providers`, the
  function MUST produce exactly `repeats` `WorkItem`s with `repeat_idx`
  values `0..repeats`.
- The total output length MUST equal `bank.items.len() * providers.len() * repeats`.

### Deterministic shuffling

- The function MUST shuffle the full output vector using a seeded PRNG
  (e.g. `rand::rngs::StdRng::seed_from_u64(seed)` with
  `SliceRandom::shuffle`) so that calling `build_work_items` twice with the
  same `bank`, `providers`, `repeats`, and `seed` produces byte-identical
  output order.
- Calling `build_work_items` with two different seeds MUST produce a
  different output order for any bank with more than one item (order
  difference verified by comparing the sequences, not just spot-checking
  one index).
- Shuffling MUST NOT drop, duplicate, or mutate any `WorkItem` field —
  only the sequence order changes. The multiset of
  `(item_id, provider, repeat_idx)` triples in the output MUST equal the
  multiset implied by the cartesian product of inputs.

## TDD Plan

### RED

- `build_work_items_given_bank_and_providers_should_produce_full_cartesian_product` — 2-item bank, 2 providers, `repeats = 3` → asserts output length is 12 and every `(item_id, provider, repeat_idx)` triple expected from the cartesian product is present exactly once.
- `build_work_items_given_same_seed_should_produce_identical_order` — same inputs, called twice with `seed = 42` → asserts the two output vectors are equal element-for-element (order included).
- `build_work_items_given_different_seeds_should_produce_different_order` — same inputs, `seed = 1` vs `seed = 2`, bank with at least 5 items → asserts the two output vectors differ in order (not equal as sequences).
- `build_work_items_given_empty_providers_should_produce_empty_output` — bank with items but `providers = []` → asserts output length is 0.

### GREEN

1. Add `bank` as a path dependency in `prober/crates/fanout/Cargo.toml`.
2. Add `rand` (with a fixed-seed-capable RNG) to workspace dependencies and
   this crate's `Cargo.toml`.
3. Define `WorkItem` struct in `prober/crates/fanout/src/lib.rs`.
4. Implement `build_work_items`: build the cartesian product via nested
   iteration (items × providers × repeats), collect into `Vec<WorkItem>`,
   then shuffle in place with the seeded RNG.
5. Run the RED tests, confirm all pass.

### REFACTOR

Extract the cartesian-product construction into a private helper if the
`build_work_items` body exceeds ~20 lines, for readability. No behavior
change.

## Dependencies

Task 01 (repo scaffolding), Task 03 (bank crate — provides `Bank`, `Item`, `GradeType`).

## Files to Create/Modify

- `prober/crates/fanout/src/lib.rs` (modify — implement `WorkItem`, `build_work_items`, and the four unit tests)
- `prober/crates/fanout/Cargo.toml` (modify — add `bank` path dependency and `rand`)

## Acceptance Criteria

- All RED tests written and failing for the right reason (compile errors or assertion failures against unimplemented `build_work_items`).
- All tests GREEN with minimal implementation.
- REFACTOR pass complete, no regressions.
- `build_work_items` produces exactly `items × providers × repeats` work items for the real bank (80 × 4 × 3 = 960) when exercised manually or via Task 08.
- Determinism verified: same seed → same order; different seed → different order.
- `cargo test -p fanout` passes with zero warnings.

## Spec Updates

None.
