# Routerlens Prober

Rust cargo workspace for probing OpenRouter providers.

## Building

```bash
# Build all crates (offline mode — no live DB required)
SQLX_OFFLINE=true cargo build --workspace

# Run a binary
cargo run --bin probe
cargo run --bin calibrate
cargo run --bin detect_incidents
```

## sqlx Offline Mode

`SQLX_OFFLINE=true` must be set when building without a live database.
Compiled query metadata is committed in `../.sqlx/` so CI can build without
a `DATABASE_URL`.
