-- Aggregate view for the dashboard and incident detector.
-- Only includes calls for active/anchor items; retired items are excluded from
-- pass_rate and cost_per_correct_usd.

create view daily_provider_stats as
select
    c.provider,
    date_trunc('day', c.created_at)                             as day,
    count(*)                                                    as call_count,
    round(
        100.0 * count(*) filter (where c.call_ok = false)
        / nullif(count(*), 0), 2
    )                                                           as error_rate,
    round(
        100.0 * count(*) filter (where c.pass = true)
        / nullif(count(*) filter (where c.pass is not null), 0), 2
    )                                                           as pass_rate,
    percentile_cont(0.50) within group (order by c.latency_ms)  as p50_latency_ms,
    percentile_cont(0.95) within group (order by c.latency_ms)  as p95_latency_ms,
    case
        when count(*) filter (where c.pass = true) = 0 then null
        else sum(c.cost_usd) / count(*) filter (where c.pass = true)
    end                                                         as cost_per_correct_usd
from calls c
left join item_status s on s.item_id = c.item_id
where coalesce(s.status, 'active') in ('active', 'anchor')
group by c.provider, date_trunc('day', c.created_at);

-- Anon role may SELECT from this view only.
grant select on daily_provider_stats to anon;
