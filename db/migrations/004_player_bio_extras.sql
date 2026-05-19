-- Bio fields needed for the classifier and UI:
--   * draft pick (round + overall number)
--   * jersey number (UI requirement)
--   * height in inches (so we don't need a Combine row to enforce the
--     position-gates that distinguish guards from bigs)
--   * shooting splits on a per-season basis (rim / mid / 3pt)

alter table players
    add column if not exists draft_round    integer,
    add column if not exists draft_number   integer,
    add column if not exists jersey_number  text,
    add column if not exists height_inches  numeric(5,2),
    add column if not exists headshot_url   text,
    add column if not exists team_id        integer;

-- Stats_normalized: ratio of games started vs played, for the
-- "bench scorer" gate that distinguishes Microwave Scorer from a starter.
alter table stats_normalized
    add column if not exists games_started  integer;

-- Per-zone shooting splits (rim / mid / 3pt) — populated by the dashboard's
-- shooting-splits endpoint. Keyed alongside stats_normalized.
create table if not exists shot_splits (
    id              uuid primary key default uuid_generate_v4(),
    player_id       uuid not null references players(id) on delete cascade,
    season          text not null,
    league          player_source not null,
    -- frequencies sum to ~1.0
    rim_freq        numeric(5,4),
    mid_freq        numeric(5,4),
    three_freq      numeric(5,4),
    -- shooting accuracy by zone
    rim_fg_pct      numeric(5,4),
    mid_fg_pct      numeric(5,4),
    three_fg_pct    numeric(5,4),
    -- additional drive / play-type signals where available
    drives_per_game numeric(5,2),
    post_up_freq    numeric(5,4),
    catch_shoot_freq numeric(5,4),
    created_at      timestamptz not null default now(),
    unique (player_id, season, league)
);

create index if not exists shot_splits_player_idx on shot_splits (player_id, season);
