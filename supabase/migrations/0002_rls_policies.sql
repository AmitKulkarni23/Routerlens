-- Row-level security: anon role has zero access to fact tables.
-- Service-role bypasses RLS by default in Postgres/Supabase — no service-role
-- policies are declared here intentionally.

alter table runs         enable row level security;
alter table calls        enable row level security;
alter table item_status  enable row level security;
alter table incidents    enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon on fact tables.
-- Anon access is restricted to the daily_provider_stats view (migration 0003).
