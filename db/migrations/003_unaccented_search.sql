-- K-bar fuzzy player search.
-- Matches NBA-style names (Nikola Jokić, Luka Dončić) regardless of diacritics,
-- prioritizes prefix matches, then ranks by trigram similarity.

create extension if not exists unaccent;

create or replace function search_players(q text, lim int default 10)
returns table (
    id uuid,
    name text,
    slug text,
    "position" player_position,
    draft_class integer,
    current_team text,
    is_nba boolean,
    source player_source
)
language sql stable
as $$
    select
        p.id,
        p.name,
        p.slug,
        p.position,
        p.draft_class,
        p.current_team,
        p.is_nba,
        p.source
    from players p
    where unaccent(p.name) ilike '%' || unaccent(q) || '%'
       or p.slug ilike '%' || q || '%'
    order by
        case when unaccent(lower(p.name)) like unaccent(lower(q)) || '%' then 0 else 1 end,
        similarity(p.name, q) desc,
        p.is_nba desc
    limit lim;
$$;
