-- Public view: failed calls only, for the drill-down detail page.
-- Exposes raw_response so engineers can see exactly what went wrong.

create view failures_public as
select
    c.item_id,
    c.category,
    c.provider,
    c.raw_response,
    c.created_at
from calls c
left join item_status s on s.item_id = c.item_id
where c.pass = false
  and coalesce(s.status, 'active') in ('active', 'anchor');

grant select on failures_public to anon;
