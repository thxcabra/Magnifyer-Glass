-- Namesakes are legitimate in NBA history (two "Marcus Williams", etc.).
-- Slug becomes a human-readable label; uniqueness is enforced by external_id.

alter table players drop constraint if exists players_slug_key;

-- Keep a non-unique index for fast lookup by slug.
drop index if exists players_slug_idx;
create index if not exists players_slug_idx on players (slug);

-- Make combine ingestion idempotent: one official measurement per
-- (player, event). Re-running the loader now upserts instead of duplicating.
alter table physical_profiles
    add constraint physical_profiles_player_event_unique
    unique (player_id, source_event);
