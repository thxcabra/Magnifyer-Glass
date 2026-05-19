-- Per-player percentile cache. The classifier job computes percentiles
-- across the NBA corpus once and writes them back here so the API never
-- has to recompute them per request.
--
-- Shape: { "usg_pct": 92.4, "ast_pct": 78.1, "ts_pct": 65.0, ... }
-- All values are 0..100, NBA-corpus percentiles.

alter table players
    add column if not exists percentiles jsonb;
