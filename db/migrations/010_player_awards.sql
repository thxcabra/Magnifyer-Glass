-- Individual and team accolades. Sourced from nba_api's PlayerAwards endpoint,
-- which returns rows per (player, award, season). Free-text DESCRIPTION fields
-- are mapped to a controlled enum on ingest so the UI can group consistently.

do $$ begin
    create type award_type as enum (
        'mvp',
        'finals_mvp',
        'dpoy',
        'roy',
        'sixth_man',
        'most_improved',
        'clutch_player',
        'all_star',
        'all_star_mvp',
        'all_nba_first',
        'all_nba_second',
        'all_nba_third',
        'all_defensive_first',
        'all_defensive_second',
        'all_rookie_first',
        'all_rookie_second',
        'scoring_title',
        'assists_title',
        'rebounding_title',
        'steals_title',
        'blocks_title',
        'champion',
        'hof_inductee',
        'other'
    );
exception when duplicate_object then null; end $$;

create table if not exists player_awards (
    id              uuid primary key default uuid_generate_v4(),
    player_id       uuid not null references players(id) on delete cascade,
    award           award_type not null,
    season          text,                  -- '2015-16' (NULL for HOF / lifetime)
    team_abbr       text,                  -- the team the player played for that season
    description     text,                  -- raw description from PlayerAwards
    created_at      timestamptz not null default now()
);

create index if not exists player_awards_player_idx on player_awards (player_id);
create index if not exists player_awards_season_idx on player_awards (season);
create index if not exists player_awards_award_idx on player_awards (award);

-- (player_id, award, season) is the natural unique key. Use a partial index
-- because season can be NULL for HOF inductions.
create unique index if not exists player_awards_player_award_season_uk
    on player_awards (player_id, award, season)
    where season is not null;
create unique index if not exists player_awards_player_award_lifetime_uk
    on player_awards (player_id, award)
    where season is null;
