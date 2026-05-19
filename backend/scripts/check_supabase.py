"""Verify Supabase connection and migration state.

Usage (from backend/):
    .venv\\Scripts\\python.exe scripts\\check_supabase.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make `app` importable when run as `python scripts/check_supabase.py`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.supabase_client import get_supabase  # noqa: E402

EXPECTED_TABLES = [
    "players",
    "physical_profiles",
    "stats_normalized",
    "play_type_data",
    "hustle_metrics",
    "similarity_cache",
]


def main() -> int:
    sb = get_supabase()
    print("[ok] supabase client initialized")

    missing: list[str] = []
    for table in EXPECTED_TABLES:
        try:
            res = sb.table(table).select("*", count="exact").limit(1).execute()
            count = res.count if res.count is not None else "?"
            print(f"[ok] {table:<20} rows={count}")
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            if "PGRST205" in msg or "schema cache" in msg or "does not exist" in msg:
                missing.append(table)
                print(f"[missing] {table}")
            else:
                print(f"[error] {table}: {msg[:200]}")
                return 2

    if missing:
        print()
        print(f"Migration not applied. Missing: {', '.join(missing)}")
        print("Run db/migrations/001_init_schema.sql in the Supabase SQL editor.")
        return 1

    print()
    print("All tables present. Database ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
