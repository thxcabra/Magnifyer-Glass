"""Build a single feature row per player from the normalized tables.

Used by the offline jobs that need a "player vs player" view, such as the
archetype classifier.

Representative-season logic: a player's feature row uses the season in
which they played the most minutes — a simple proxy for "career peak"
that avoids picking up garbage-time rookie years or end-of-bench seasons.
"""

from __future__ import annotations

from typing import Any, Callable

import pandas as pd

from app.core.supabase_client import get_supabase
from app.services.normalization import PHYS_FEATURES, STATS_FEATURES

SUPABASE_PAGE = 1000


def _paginate(sb, table: str, query_fn: Callable) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        res = query_fn(sb.table(table)).range(offset, offset + SUPABASE_PAGE - 1).execute()
        chunk = res.data or []
        rows.extend(chunk)
        if len(chunk) < SUPABASE_PAGE:
            break
        offset += SUPABASE_PAGE
    return rows


def _representative_stats(stats: pd.DataFrame) -> pd.DataFrame:
    """One row per player: their peak season.

    "Peak" = season with the highest usage-rate × games-played product.
    This biases toward years when the player was a real offensive
    centerpiece for a full season, not a high-usage cup of coffee.
    Falls back to max(pts_per100 × games_played) if usage is missing
    for every season (older players pre-advanced-stats).
    """
    if stats.empty:
        return pd.DataFrame(columns=["player_id"])

    df = stats.copy()
    df["games_played"] = df["games_played"].fillna(0)
    df["_peak_score"] = df["usg_pct"].fillna(0) * df["games_played"]

    # Players where usage is NaN for every season: fall back to scoring volume.
    no_usage = df.groupby("player_id")["usg_pct"].transform(lambda s: s.isna().all())
    df.loc[no_usage, "_peak_score"] = (
        df.loc[no_usage, "pts_per100"].fillna(0) * df.loc[no_usage, "games_played"]
    )

    idx = df.groupby("player_id")["_peak_score"].idxmax()
    return df.loc[idx].drop(columns="_peak_score").reset_index(drop=True)


def _representative_physical(phys: pd.DataFrame) -> pd.DataFrame:
    """One row per player: official first, then most recent (query orders this)."""
    if phys.empty:
        return pd.DataFrame(columns=["player_id"])
    return phys.drop_duplicates(subset=["player_id"], keep="first").reset_index(drop=True)


def _representative_hustle(hustle: pd.DataFrame) -> pd.DataFrame:
    """One row per player: their most recent season."""
    if hustle.empty:
        return pd.DataFrame(columns=["player_id"])
    return (
        hustle.sort_values(["player_id", "season"], ascending=[True, False])
        .drop_duplicates(subset=["player_id"], keep="first")
        .reset_index(drop=True)
    )


def load_player_features(
    *,
    is_nba: bool,
    include_hustle: bool = True,
) -> pd.DataFrame:
    """Merged feature matrix: one row per player with stats + physical + hustle.

    Missing values stay as NaN — downstream consumers decide how to handle them.
    """
    sb = get_supabase()

    players = _paginate(
        sb,
        "players",
        lambda q: q.select(
            "id, name, slug, source, position, draft_class, is_nba, height_inches"
        ).eq("is_nba", is_nba),
    )
    if not players:
        return pd.DataFrame()

    players_df = pd.DataFrame(players).rename(columns={"id": "player_id"})

    # Representative-season logic only considers regular-season rows.
    # Playoff samples are small and would skew percentiles.
    stats = _paginate(
        sb,
        "stats_normalized",
        lambda q: q.select("*").eq("season_type", "regular_season"),
    )
    stats_rep = _representative_stats(pd.DataFrame(stats) if stats else pd.DataFrame())

    phys = _paginate(
        sb,
        "physical_profiles",
        lambda q: q.select("*").order("is_official", desc=True).order("measured_on", desc=True),
    )
    phys_rep = _representative_physical(pd.DataFrame(phys) if phys else pd.DataFrame())

    stat_cols = [c for c in STATS_FEATURES if c in stats_rep.columns]
    phys_cols = [c for c in PHYS_FEATURES if c in phys_rep.columns]

    merged = players_df.merge(
        stats_rep[["player_id", *stat_cols]], on="player_id", how="left"
    ).merge(
        phys_rep[["player_id", *phys_cols]], on="player_id", how="left"
    )

    if include_hustle:
        hustle = _paginate(sb, "hustle_metrics", lambda q: q.select("*"))
        hustle_rep = _representative_hustle(pd.DataFrame(hustle) if hustle else pd.DataFrame())
        if not hustle_rep.empty:
            hustle_cols = [
                c for c in (
                    "deflections_per_game",
                    "screen_assists_per_game",
                    "contested_shots_per_game",
                    "box_outs_per_game",
                ) if c in hustle_rep.columns
            ]
            merged = merged.merge(
                hustle_rep[["player_id", *hustle_cols]], on="player_id", how="left"
            )

    for col in STATS_FEATURES + PHYS_FEATURES:
        if col not in merged.columns:
            merged[col] = pd.NA

    return merged
