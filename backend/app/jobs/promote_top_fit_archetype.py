"""One-shot fix: overwrite `players.archetype` with the top entry from
`percentiles._fits` so the displayed archetype is always the one the rules
scored highest.

The classifier writes the strict-rule winner into `players.archetype` and
stores partial-match scores in `percentiles._fits`. For many players the two
agree, but for borderline cases (e.g. Tyler Herro: classifier=floor_general at
0.295 confidence, while _fits[0]=movement_shooter at 0.677) the top-fit feels
more like the player's identity to anyone watching the games. The user
explicitly asked for the top-fit to be the headline archetype.

We promote in-place:
   players.archetype           ← _fits[0].archetype
   players.archetype_confidence ← _fits[0].score

Players with no `_fits` (no relevance qualifier — not enough minutes, etc.)
stay untouched.

    python -m app.jobs.promote_top_fit_archetype [--dry-run]
"""

from __future__ import annotations

import argparse
from collections import Counter

from app.core.supabase_client import get_supabase


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    sb = get_supabase()

    rows: list[dict] = []
    page = 1000
    offset = 0
    while True:
        res = (
            sb.table("players")
            .select("id, name, archetype, archetype_confidence, percentiles")
            .eq("is_nba", True)
            .range(offset, offset + page - 1)
            .execute()
        )
        chunk = res.data or []
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page

    print(f"Inspecting {len(rows)} NBA players")

    swaps: list[tuple[str, str | None, str, float]] = []   # (id, old, new, score)
    by_change: Counter[tuple[str | None, str]] = Counter()
    skipped_no_fits = 0
    untouched_same = 0

    for r in rows:
        pcts = r.get("percentiles") or {}
        fits = pcts.get("_fits") or []
        if not fits:
            skipped_no_fits += 1
            continue
        top = fits[0]
        new_arch = top.get("archetype")
        new_score = top.get("score")
        if not new_arch:
            continue
        old_arch = r.get("archetype")
        if old_arch == new_arch:
            untouched_same += 1
            continue
        swaps.append((r["id"], old_arch, new_arch, float(new_score or 0)))
        by_change[(old_arch, new_arch)] += 1

    print("\nSummary:")
    print(f"  no _fits stored      : {skipped_no_fits}")
    print(f"  already matches top  : {untouched_same}")
    print(f"  about to promote     : {len(swaps)}")

    print("\nMost common transitions (old -> new):")
    for (old, new), cnt in by_change.most_common(20):
        print(f"  {cnt:5d}  {old!r:30s} -> {new!r}")

    if args.dry_run:
        print("\nDry run — not writing.")
        return

    # Per-row UPDATEs. PostgREST upsert with a partial payload tries to INSERT
    # a fully-null row on the rare miss, which the players.source NOT NULL
    # constraint rejects. UPDATE is the safe primitive for this kind of
    # in-place column change.
    written = 0
    for pid, _old, new, score in swaps:
        sb.table("players").update(
            {"archetype": new, "archetype_confidence": score}
        ).eq("id", pid).execute()
        written += 1
        if written % 50 == 0 or written == len(swaps):
            print(f"  {written}/{len(swaps)} promoted")

    print(f"\nDone. {written} players promoted.")


if __name__ == "__main__":
    main()
