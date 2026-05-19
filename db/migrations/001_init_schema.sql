-- Magnifyer Glass — initial Supabase schema
-- Run in Supabase SQL editor (or via `supabase db push`).

-- =====================================================================
-- Extensions
-- =====================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- trigram index for fuzzy search

-- =====================================================================
-- Enums
-- =====================================================================
do $$ begin
    create type player_position as enum ('PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'G-F', 'F-G', 'F-C', 'C-F');
exception when duplicate_object then null; end $$;

do $$ begin
    create type player_source as enum ('nba', 'ncaa', 'international', 'g_league');
exception when duplicate_object then null; end $$;

do $$ begin
    create type archetype_label as enum (
        'helio_centric_creator',
        'floor_general',
        'microwave_scorer',
        'three_and_d',
        'lockdown_poa_defender',
        'movement_shooter',
        'slashing_wing',
        'point_forward',
        'connective_glue',
        'stretch_big',
        'rim_protector',
        'post_up_hub',
        'mobile_big',
        'glass_cleaner'
    );
exception when duplicate_object then null; end $$;

-- =====================================================================
-- players
-- =====================================================================
create table if not exists players (
    id              uuid primary key default uuid_generate_v4(),
    external_id     text unique,                -- nba.com id, sports-ref slug, realgm id, etc.
    source          player_source not null,
    name            text not null,
    slug            text unique not null,
    is_nba          boolean not null default false,
    position        player_position,
    draft_class     integer,                    -- year, e.g. 2025
    current_team    text,
    born_on         date,
    country         text,
    college         text,
    archetype       archetype_label,            -- denormalized cache of classifier output
    archetype_confidence numeric(5,4),          -- 0..1
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists players_name_trgm on players using gin (name gin_trgm_ops);
create index if not exists players_slug_idx on players (slug);
create index if not exists players_draft_class_idx on players (draft_class) where is_nba = false;
create index if not exists players_archetype_idx on players (archetype);

-- =====================================================================
-- physical_profiles
-- One row per (player, measurement_event). NBA combine often re-measures.
-- =====================================================================
create table if not exists physical_profiles (
    id                      uuid primary key default uuid_generate_v4(),
    player_id               uuid not null references players(id) on delete cascade,
    measured_on             date,
    is_official             boolean not null default false,  -- true if from NBA Draft Combine
    source_event            text,                            -- e.g. '2024 NBA Draft Combine'
    height_no_shoes_in      numeric(5,2),
    height_with_shoes_in    numeric(5,2),
    weight_lbs              numeric(6,2),
    wingspan_in             numeric(5,2),
    standing_reach_in       numeric(5,2),
    hand_length_in          numeric(4,2),
    hand_width_in           numeric(4,2),
    body_fat_pct            numeric(4,2),
    vertical_leap_max_in    numeric(5,2),       -- max vertical
    vertical_leap_std_in    numeric(5,2),       -- standing vertical
    lane_agility_sec        numeric(5,3),
    three_quarter_sprint_sec numeric(5,3),
    bench_press_reps        integer,
    created_at              timestamptz not null default now()
);

create index if not exists physical_profiles_player_idx on physical_profiles (player_id);
create index if not exists physical_profiles_official_idx on physical_profiles (player_id) where is_official;

-- =====================================================================
-- stats_normalized — Per 100 possessions
-- One row per (player, season, source_league). Supports career arc storage.
-- =====================================================================
create table if not exists stats_normalized (
    id              uuid primary key default uuid_generate_v4(),
    player_id       uuid not null references players(id) on delete cascade,
    season          text not null,                    -- e.g. '2024-25'
    league          player_source not null,
    team            text,
    games_played    integer,
    minutes_total   numeric(7,1),
    -- Per-100 possessions box metrics
    pts_per100      numeric(6,2),
    ast_per100      numeric(6,2),
    reb_per100      numeric(6,2),
    stl_per100      numeric(6,2),
    blk_per100      numeric(6,2),
    tov_per100      numeric(6,2),
    fga_per100      numeric(6,2),
    fta_per100      numeric(6,2),
    tpa_per100      numeric(6,2),                     -- 3PA per 100
    tpm_per100      numeric(6,2),                     -- 3PM per 100
    -- Rate / efficiency
    ts_pct          numeric(5,4),
    efg_pct         numeric(5,4),
    fg_pct          numeric(5,4),
    tp_pct          numeric(5,4),
    ft_pct          numeric(5,4),
    usg_pct         numeric(5,4),
    ast_pct         numeric(5,4),
    reb_pct         numeric(5,4),
    oreb_pct        numeric(5,4),
    dreb_pct        numeric(5,4),
    stl_pct         numeric(5,4),
    blk_pct         numeric(5,4),
    tov_pct         numeric(5,4),
    -- Advanced
    bpm             numeric(5,2),
    obpm            numeric(5,2),
    dbpm            numeric(5,2),
    per             numeric(5,2),
    ws_per_48       numeric(5,3),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (player_id, season, league)
);

create index if not exists stats_normalized_player_idx on stats_normalized (player_id);
create index if not exists stats_normalized_season_idx on stats_normalized (season);

-- =====================================================================
-- play_type_data — Synergy-style breakdowns
-- One row per (player, season, play_type)
-- =====================================================================
do $$ begin
    create type play_type as enum (
        'isolation',
        'pnr_ball_handler',
        'pnr_roll_man',
        'spot_up',
        'transition',
        'post_up',
        'off_screen',
        'handoff',
        'cut',
        'putback',
        'misc'
    );
exception when duplicate_object then null; end $$;

create table if not exists play_type_data (
    id              uuid primary key default uuid_generate_v4(),
    player_id       uuid not null references players(id) on delete cascade,
    season          text not null,
    play_type       play_type not null,
    possessions     integer,
    frequency_pct   numeric(5,4),                 -- share of player's offensive possessions
    points          integer,
    ppp             numeric(5,3),                 -- points per possession
    percentile      numeric(5,2),                 -- league percentile, 0..100
    created_at      timestamptz not null default now(),
    unique (player_id, season, play_type)
);

create index if not exists play_type_data_player_season_idx on play_type_data (player_id, season);

-- =====================================================================
-- hustle_metrics
-- =====================================================================
create table if not exists hustle_metrics (
    id                      uuid primary key default uuid_generate_v4(),
    player_id               uuid not null references players(id) on delete cascade,
    season                  text not null,
    games_played            integer,
    deflections_per_game    numeric(5,2),
    screen_assists_per_game numeric(5,2),
    contested_shots_per_game numeric(5,2),
    loose_balls_recovered_per_game numeric(5,2),
    charges_drawn_per_game  numeric(5,2),
    box_outs_per_game       numeric(5,2),
    created_at              timestamptz not null default now(),
    unique (player_id, season)
);

create index if not exists hustle_metrics_player_season_idx on hustle_metrics (player_id, season);

-- =====================================================================
-- similarity_cache — precomputed top-N matches for fast comparison page loads
-- =====================================================================
create table if not exists similarity_cache (
    id              uuid primary key default uuid_generate_v4(),
    prospect_id     uuid not null references players(id) on delete cascade,
    match_id        uuid not null references players(id) on delete cascade,
    similarity      numeric(7,6) not null,         -- 0..1
    stats_component numeric(7,6),
    phys_component  numeric(7,6),
    weights         jsonb not null default '{"stats": 0.7, "phys": 0.3}'::jsonb,
    season_basis    text,                          -- which season was used for stats
    computed_at     timestamptz not null default now(),
    unique (prospect_id, match_id, weights)
);

create index if not exists similarity_cache_prospect_idx on similarity_cache (prospect_id, similarity desc);

-- =====================================================================
-- updated_at trigger
-- =====================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists players_set_updated_at on players;
create trigger players_set_updated_at
    before update on players
    for each row execute function set_updated_at();

drop trigger if exists stats_normalized_set_updated_at on stats_normalized;
create trigger stats_normalized_set_updated_at
    before update on stats_normalized
    for each row execute function set_updated_at();
