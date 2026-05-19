-- The partial indexes in 010 can't be used as ON CONFLICT targets via PostgREST.
-- Replace them with a single proper unique constraint, using a sentinel value
-- ('_lifetime_') for awards that don't have a season (e.g. Hall of Fame entries
-- where the endpoint occasionally returns no SEASON).

truncate table player_awards;

drop index if exists player_awards_player_award_season_uk;
drop index if exists player_awards_player_award_lifetime_uk;

alter table player_awards alter column season set default '_lifetime_';
update player_awards set season = '_lifetime_' where season is null;
alter table player_awards alter column season set not null;

alter table player_awards
    add constraint player_awards_unique
    unique (player_id, award, season);
