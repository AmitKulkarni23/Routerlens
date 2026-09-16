-- Core fact tables for Routerlens.
-- Writes happen only via service-role DATABASE_URL (CI/local).
-- Service-role bypasses RLS by default; no explicit service-role policies needed.

create extension if not exists "pgcrypto";

create table runs (
    id           uuid primary key default gen_random_uuid(),
    started_at   timestamptz not null,
    finished_at  timestamptz,
    bank_version int not null,
    git_sha      text,
    status       text not null check (status in ('completed', 'partial', 'failed'))
);

create table calls (
    id             uuid primary key default gen_random_uuid(),
    run_id         uuid not null references runs(id),
    item_id        text not null,
    category       text not null,
    provider       text not null,
    repeat_idx     int not null,
    call_ok        boolean not null,
    pass           boolean,
    raw_response   text,
    finish_reason  text,
    latency_ms     int,
    cost_usd       numeric,
    -- error_kind values are the taxonomy defined by the openrouter crate (task 05);
    -- left unconstrained here so crate remains the single source of truth.
    error_kind     text,
    created_at     timestamptz not null default now()
);

create table item_status (
    item_id     text primary key,
    status      text not null check (status in ('active', 'retired_too_hard', 'retired_ceiling', 'anchor')),
    reason      text,
    updated_at  timestamptz not null default now()
);

create table incidents (
    id           uuid primary key default gen_random_uuid(),
    provider     text not null,
    detected_at  timestamptz not null default now(),
    metric       text not null,
    baseline     numeric not null,
    observed     numeric not null,
    delta        numeric not null,
    resolved_at  timestamptz
);

-- Indexes for aggregate view and incident-resolution lookups.
create index on calls (run_id);
create index on calls (provider, created_at);
create index on incidents (provider, resolved_at);
