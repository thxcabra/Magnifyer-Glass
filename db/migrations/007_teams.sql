-- Teams catalog. Used to render team profile pages and resolve abbreviation
-- → name/city/logo for any per-season team affiliation in stats_normalized.

create table if not exists teams (
    id            integer primary key,        -- NBA team id, e.g. 1610612737
    abbreviation  text not null unique,        -- "ATL"
    full_name     text not null,               -- "Atlanta Hawks"
    nickname      text,                        -- "Hawks"
    city          text,                        -- "Atlanta"
    state         text,                        -- "Atlanta"
    year_founded  integer,
    is_active     boolean not null default true,
    created_at    timestamptz not null default now()
);

create index if not exists teams_abbreviation_idx on teams (abbreviation);
