-- Add external_id + jersey_number to the search RPC so the K-bar can render
-- the player's NBA-CDN headshot directly instead of falling back to initials.

drop function if exists search_players(text, int);

create or replace function search_players(q text, lim int default 10)
returns table (
    id uuid,
    external_id text,
    name text,
    slug text,
    "position" player_position,
    draft_class integer,
    current_team text,
    is_nba boolean,
    source player_source,
    jersey_number text
)
language sql stable
as $$
    select
        p.id,
        p.external_id,
        p.name,
        p.slug,
        p.position,
        p.draft_class,
        p.current_team,
        p.is_nba,
        p.source,
        p.jersey_number
    from players p
    where unaccent(p.name) ilike '%' || unaccent(q) || '%'
       or p.slug ilike '%' || q || '%'
    order by
        case when unaccent(lower(p.name)) like unaccent(lower(q)) || '%' then 0 else 1 end,
        similarity(p.name, q) desc,
        p.is_nba desc
    limit lim;
$$;
