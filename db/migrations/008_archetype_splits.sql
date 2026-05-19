-- Split Post-Up Hub into three analytically distinct archetypes:
--   * post_up_hub        — Shaq/Hakeem/Ewing style (low AST, scoring)
--   * playmaking_big     — Jokić/Sabonis style (high AST for a big)
--   * two_way_anchor     — Duncan/Garnett style (defense + moderate usage)
--
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- The leading COMMIT closes the auto-started transaction Supabase wraps each
-- SQL editor run in. The IF NOT EXISTS makes this idempotent.

commit;
alter type archetype_label add value if not exists 'playmaking_big';
alter type archetype_label add value if not exists 'two_way_anchor';
