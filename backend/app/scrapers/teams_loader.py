"""One-shot team catalog ingest from nba_api's static team list.

Runs in a fraction of a second — no HTTP calls; the team list is bundled
with `nba_api`. Historical franchises (SEA, NJN, VAN, etc.) are inserted
with `is_active=False` so per-season rosters from those eras still
resolve their team abbreviation.

    python -m app.scrapers.teams_loader
"""

from __future__ import annotations

from nba_api.stats.static import teams as static_teams

from app.core.supabase_client import get_supabase

# Defunct / relocated franchises whose abbreviations still appear in old
# stats rows. We synthesize rows so the UI can render their logos and names.
LEGACY_TEAMS = [
    {"id": 1610612758, "abbreviation": "SEA", "full_name": "Seattle SuperSonics",
     "nickname": "SuperSonics", "city": "Seattle", "year_founded": 1967, "is_active": False},
    {"id": 1610612751, "abbreviation": "NJN", "full_name": "New Jersey Nets",
     "nickname": "Nets", "city": "New Jersey", "year_founded": 1967, "is_active": False},
    {"id": 1610612740, "abbreviation": "NOH", "full_name": "New Orleans Hornets",
     "nickname": "Hornets", "city": "New Orleans", "year_founded": 2002, "is_active": False},
    {"id": 1610612763, "abbreviation": "VAN", "full_name": "Vancouver Grizzlies",
     "nickname": "Grizzlies", "city": "Vancouver", "year_founded": 1995, "is_active": False},
    {"id": 1610612740, "abbreviation": "NOK", "full_name": "New Orleans/Oklahoma City Hornets",
     "nickname": "Hornets", "city": "Oklahoma City", "year_founded": 2005, "is_active": False},
    {"id": 1610612766, "abbreviation": "CHH", "full_name": "Charlotte Hornets (original)",
     "nickname": "Hornets", "city": "Charlotte", "year_founded": 1988, "is_active": False},
]


def main() -> None:
    sb = get_supabase()

    raw = static_teams.get_teams()
    rows = [
        {
            "id": t["id"],
            "abbreviation": t["abbreviation"],
            "full_name": t["full_name"],
            "nickname": t.get("nickname"),
            "city": t.get("city"),
            "state": t.get("state"),
            "year_founded": t.get("year_founded"),
            "is_active": True,
        }
        for t in raw
    ]

    # Avoid id collisions with active franchises for legacy rows that share IDs.
    active_ids = {r["id"] for r in rows}
    legacy_rows = [
        r for r in LEGACY_TEAMS
        if r["abbreviation"] not in {x["abbreviation"] for x in rows}
        and r["id"] not in active_ids
    ]

    payload = rows + legacy_rows
    sb.table("teams").upsert(payload, on_conflict="id").execute()
    print(f"Upserted {len(payload)} teams ({len(rows)} active + {len(legacy_rows)} legacy).")


if __name__ == "__main__":
    main()
