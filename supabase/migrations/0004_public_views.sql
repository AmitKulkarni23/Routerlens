-- Public read-only views exposed to the anon role via the frontend API.
-- The raw incidents and calls tables remain service-role-only (RLS, migration 0002).

-- incidents_public: all incident columns, readable by anon via the API layer.
create view incidents_public as
select
    id,
    provider,
    detected_at,
    metric,
    baseline,
    observed,
    delta,
    resolved_at
from incidents;

grant select on incidents_public to anon;

-- daily_provider_category_stats: pass rate per provider × category × day.
-- Used by the category breakdown table in the dashboard.
create view daily_provider_category_stats as
select
    c.provider,
    c.category,
    date_trunc('day', c.created_at)                             as day,
    count(*)                                                    as call_count,
    round(
        100.0 * count(*) filter (where c.pass = true)
        / nullif(count(*) filter (where c.pass is not null), 0), 2
    )                                                           as pass_rate
from calls c
left join item_status s on s.item_id = c.item_id
where coalesce(s.status, 'active') in ('active', 'anchor')
group by c.provider, c.category, date_trunc('day', c.created_at);

grant select on daily_provider_category_stats to anon;
