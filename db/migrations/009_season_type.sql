-- Distinguish Regular Season vs Playoffs rows in stats_normalized.
-- Existing rows are treated as Regular Season. Playoffs rows are added
-- by re-running the loader with `--season-type Playoffs`.

do $$ begin
    create type season_type as enum ('regular_season', 'playoffs');
exception when duplicate_object then null; end $$;

alter table stats_normalized
    add column if not exists season_type season_type not null default 'regular_season';

-- Existing unique constraint was on (player_id, season, league). Add season_type
-- so the same player can have both a RS and a Playoffs row for the same season.
alter table stats_normalized
    drop constraint if exists stats_normalized_player_id_season_league_key;

alter table stats_normalized
    add constraint stats_normalized_player_id_season_league_type_key
    unique (player_id, season, league, season_type);

create index if not exists stats_normalized_season_type_idx
    on stats_normalized (player_id, season_type);
