-- Per-game traditional stats alongside the per-100 analytical columns.
-- Stored in the same row so a single SELECT returns both modes.

alter table stats_normalized
    add column if not exists pts_per_game   numeric(5,2),
    add column if not exists ast_per_game   numeric(5,2),
    add column if not exists reb_per_game   numeric(5,2),
    add column if not exists oreb_per_game  numeric(5,2),
    add column if not exists dreb_per_game  numeric(5,2),
    add column if not exists stl_per_game   numeric(5,2),
    add column if not exists blk_per_game   numeric(5,2),
    add column if not exists tov_per_game   numeric(5,2),
    add column if not exists fga_per_game   numeric(5,2),
    add column if not exists fgm_per_game   numeric(5,2),
    add column if not exists fta_per_game   numeric(5,2),
    add column if not exists ftm_per_game   numeric(5,2),
    add column if not exists tpa_per_game   numeric(5,2),
    add column if not exists tpm_per_game   numeric(5,2),
    add column if not exists plus_minus_per_game numeric(5,2);
