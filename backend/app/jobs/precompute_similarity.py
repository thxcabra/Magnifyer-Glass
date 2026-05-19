"""Precompute similarity_cache for every prospect against the NBA pool.

This is the offline batch job that powers the /compare/{slug} endpoint.

Run:
    python -m app.jobs.precompute_similarity --top-n 10
"""

from __future__ import annotations

import argparse
import json

from app.core.config import get_settings
from app.core.supabase_client import get_supabase
from app.services.features import load_player_features
from app.services.normalization import PHYS_FEATURES, STATS_FEATURES
from app.services.similarity import SimilarityEngine


def run(top_n: int, weights: tuple[float, float]) -> None:
    sb = get_supabase()

    print("Loading NBA pool...")
    nba_df = load_player_features(is_nba=True)
    print(f"  NBA players: {len(nba_df)}")

    has_stats = nba_df[STATS_FEATURES].notna().any(axis=1)
    has_phys = nba_df[PHYS_FEATURES].notna().any(axis=1)
    nba_df = nba_df[has_stats & has_phys].reset_index(drop=True)
    print(f"  retained (stats + physical present): {len(nba_df)}")
    if nba_df.empty:
        print("Empty NBA corpus. Run the loader first.")
        return

    print("Loading prospects...")
    prospect_df = load_player_features(is_nba=False)
    print(f"  prospects: {len(prospect_df)}")
    if prospect_df.empty:
        print("No prospects yet. Run an NCAA/international scraper first.")
        return

    engine = SimilarityEngine(weights=weights).fit(nba_df)
    weights_json = {"stats": weights[0], "phys": weights[1]}

    written = 0
    for _, prospect_row in prospect_df.iterrows():
        prospect_id = prospect_row["player_id"]
        matches = engine.match(prospect_row.to_frame().T, top_n=top_n)

        rows = [
            {
                "prospect_id": prospect_id,
                "match_id": m.player_id,
                "similarity": m.similarity,
                "stats_component": m.stats_component,
                "phys_component": m.phys_component,
                "weights": weights_json,
            }
            for m in matches
        ]
        if rows:
            sb.table("similarity_cache").upsert(
                rows, on_conflict="prospect_id,match_id,weights"
            ).execute()
            written += len(rows)

    print(f"Done. Cached {written} match rows for {len(prospect_df)} prospects.")


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser()
    parser.add_argument("--top-n", type=int, default=settings.similarity_top_n)
    parser.add_argument("--w-stats", type=float, default=settings.similarity_weight_stats)
    parser.add_argument("--w-phys", type=float, default=settings.similarity_weight_phys)
    args = parser.parse_args()
    run(top_n=args.top_n, weights=(args.w_stats, args.w_phys))


if __name__ == "__main__":
    main()
