-- End-of-season standings per team. One row per (team, season). Sourced from
-- nba_api's LeagueStandings endpoint. Conference rank lets us render east/west
-- ladders on /years pages without computing it on the fly.

create table if not exists team_standings (
    id                  uuid primary key default uuid_generate_v4(),
    team_id             bigint not null references teams(id) on delete cascade,
    team_abbr           text not null,
    season              text not null,            -- '2015-16'
    conference          text,                     -- 'East' | 'West'
    division            text,                     -- 'Atlantic', 'Pacific', ...
    wins                int,
    losses              int,
    win_pct             numeric(5, 4),
    conference_rank     int,
    division_rank       int,
    games_back          numeric(5, 1),            -- distance from #1 in conference
    home_record         text,                     -- '32-9'
    road_record         text,
    last_10             text,                     -- '7-3'
    streak              text,                     -- 'W4', 'L2'
    points_pg           numeric(6, 2),
    opp_points_pg       numeric(6, 2),
    point_diff_pg       numeric(6, 2),
    playoff_seed        int,                      -- 1..8 (or null if missed playoffs)
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint team_standings_team_season_uk unique (team_id, season)
);

create index if not exists team_standings_season_idx on team_standings (season);
create index if not exists team_standings_conf_season_idx on team_standings (conference, season);


-- Playoff series results. One row per series across a season. Identifies the
-- round, the two teams, who won, and the result string (e.g. '4-2'). Sourced
-- from nba_api's CommonPlayoffSeries / PlayoffPicture, augmented with the
-- conference championship + finals from manual knowledge for older seasons.

create table if not exists playoff_series (
    id                  uuid primary key default uuid_generate_v4(),
    season              text not null,
    round               text not null,            -- 'first_round' | 'conf_semis' | 'conf_finals' | 'finals'
    conference          text,                     -- East | West | null (for finals)
    higher_seed_abbr    text not null,
    lower_seed_abbr     text not null,
    winner_abbr         text not null,
    result              text,                     -- '4-2', '4-0', etc.
    series_order        int not null,             -- 1..15 within the season for stable sort
    created_at          timestamptz not null default now(),
    constraint playoff_series_uk unique (season, round, higher_seed_abbr, lower_seed_abbr)
);

create index if not exists playoff_series_season_idx on playoff_series (season);
