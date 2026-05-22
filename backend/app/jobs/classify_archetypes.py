"""Classify every player into one of the 14 tactical archetypes.

Percentiles are computed within the NBA corpus, then both NBA players and
prospects are scored against those percentile thresholds. Results are
written to players.archetype + players.archetype_confidence so the API
never has to compute classifications per request.

Run:
    python -m app.jobs.classify_archetypes
"""

from __future__ import annotations

import argparse

import pandas as pd

from app.core.supabase_client import get_supabase
from app.services.archetypes import ARCHETYPES, classify, fit_scores
from app.services.features import load_player_features

# Players below this bar don't get an archetype assigned. The archetype
# label is meaningless for end-of-bench cups of coffee — better NULL than wrong.
RELEVANCE_PEAK_MPG = 14           # peak season minutes per game
RELEVANCE_PEAK_GAMES = 25         # peak season games played
RELEVANCE_PEAK_USG_PCT = 0.08     # peak season usage rate (8%)

# Columns whose percentiles the archetype rules consult.
PERCENTILE_SOURCES = [
    # Per-100 box stats
    "pts_per100",
    "ast_per100",
    "reb_per100",
    "stl_per100",
    "blk_per100",
    "tpa_per100",
    # Rate stats
    "ts_pct",
    "efg_pct",
    "usg_pct",
    "ast_pct",
    "reb_pct",
    "stl_pct",
    "blk_pct",
    "tov_pct",
    "tp_pct",
    # Volume signals (used directly + by derived ratios)
    "minutes_total",  # actually MPG — bench gate for Microwave Scorer
    # Derived (computed by _derive_features)
    "tp_freq",        # 3PA / FGA
    "ast_to_ratio",   # AST / TOV
    "ftr",            # FTA / FGA — free-throw rate
    # Hustle
    "deflections_per_game",
    "screen_assists_per_game",
]


def _derive_features(df: pd.DataFrame) -> pd.DataFrame:
    """Adds the derived columns the archetype classifier needs."""
    out = df.copy()

    def _safe_div(num: str, den: str) -> pd.Series:
        if num not in out.columns or den not in out.columns:
            return pd.Series([pd.NA] * len(out), index=out.index, dtype="Float64")
        denom = out[den].replace(0, pd.NA)
        return out[num] / denom

    out["tp_freq"] = _safe_div("tpa_per100", "fga_per100")
    out["ast_to_ratio"] = _safe_div("ast_per100", "tov_per100")
    out["ftr"] = _safe_div("fta_per100", "fga_per100")
    return out


def _rank_to_percentile(series: pd.Series) -> pd.Series:
    """Percentile rank among non-null values; NaN stays NaN.

    `na_option="bottom"` is misleading — it puts NaN at the END of the sort
    (highest rank), which pollutes real values' percentiles when many rows
    are missing. Keep semantics: rank only known values; treat unknowns as
    "data missing", not "data low".
    """
    return series.rank(pct=True, na_option="keep") * 100.0


def compute_percentile_frame(features: pd.DataFrame) -> pd.DataFrame:
    """Append `<col>_pct` columns ranked within the input frame."""
    enriched = _derive_features(features)
    for col in PERCENTILE_SOURCES:
        if col in enriched.columns:
            enriched[f"{col}_pct"] = _rank_to_percentile(enriched[col])
    return enriched


def run() -> None:
    sb = get_supabase()

    print("Loading NBA pool to compute percentile basis...")
    nba_df = load_player_features(is_nba=True)
    print(f"  NBA players: {len(nba_df)}")
    if nba_df.empty:
        print("Empty NBA corpus. Aborting.")
        return

    print("Loading prospects...")
    prospect_df = load_player_features(is_nba=False)
    print(f"  prospects: {len(prospect_df)}")

    # Prospects are ranked against the same NBA-derived distribution.
    # Build a combined frame so prospects get percentiles relative to the NBA basis.
    combined = pd.concat([nba_df.assign(_pool="nba"), prospect_df.assign(_pool="prospect")], ignore_index=True)
    combined_pct = compute_percentile_frame(combined)

    # Re-rank: for each metric, replace prospect rows' percentile with their
    # rank against the NBA-only distribution (avoids prospects pulling
    # the percentile basis toward college-level norms).
    for col in PERCENTILE_SOURCES:
        pct_col = f"{col}_pct"
        if pct_col not in combined_pct.columns:
            continue
        nba_vals = combined_pct.loc[combined_pct["_pool"] == "nba", col].dropna().sort_values()
        if nba_vals.empty:
            continue
        # Use searchsorted against NBA distribution for prospects.
        prospect_mask = combined_pct["_pool"] == "prospect"
        prospect_vals = combined_pct.loc[prospect_mask, col]
        ranks = nba_vals.searchsorted(prospect_vals.fillna(nba_vals.min() - 1).values) / len(nba_vals)
        combined_pct.loc[prospect_mask, pct_col] = ranks * 100.0

    updates: list[dict] = []
    counts: dict[str, int] = {a.label.value: 0 for a in ARCHETYPES}
    unclassified = 0
    skipped_irrelevant = 0

    def _is_relevant(row: pd.Series) -> bool:
        """Gate: the archetype is only meaningful for real rotation players.

        Pre-1996 players don't have USG_PCT (the advanced endpoint starts in
        1996-97), so we never let a missing advanced stat disqualify a
        rotation-minutes player — we only use it as an additional filter for
        the modern era where it exists.
        """
        # Prospects always classify (they're the whole point).
        if not row.get("is_nba", True):
            return True

        mpg = row.get("minutes_total")
        gp = row.get("games_played")
        if mpg is None or pd.isna(mpg) or mpg < RELEVANCE_PEAK_MPG:
            return False
        if gp is None or pd.isna(gp) or gp < RELEVANCE_PEAK_GAMES:
            return False

        # USG filter applies only when present. NaN = pre-1996 era, not "low usage".
        usg = row.get("usg_pct")
        if usg is not None and not pd.isna(usg) and usg < RELEVANCE_PEAK_USG_PCT:
            return False
        return True

    def _percentiles_payload(row: pd.Series) -> dict[str, float]:
        out: dict[str, float] = {}
        for col in PERCENTILE_SOURCES:
            v = row.get(f"{col}_pct")
            if v is not None and not (isinstance(v, float) and pd.isna(v)):
                out[col] = round(float(v), 1)
        return out

    def _resolved_position(row: pd.Series) -> str | None:
        """NBA Stats's CommonPlayerInfo returns ambiguous POSITION strings —
        "Guard" and "Forward" with no PG/SG or SF/PF distinction. Use height
        to refine so big-only and wing-only archetypes route correctly.

        Thresholds:
          F + height ≥ 84"  → PF  (Dirk 7'0" yes, KD 6'11" stays a wing)
          G + height ≥ 77"  → SG  (Klay/Ray Allen 6'5" route to wing archetypes)
        """
        pos = row.get("position")
        h = row.get("height_inches")
        if h is None or pd.isna(h):
            return pos
        if pos == "F" and h >= 84:
            return "PF"
        if pos == "G" and h >= 77:
            return "SG"
        return pos

    for _, row in combined_pct.iterrows():
        if not _is_relevant(row):
            skipped_irrelevant += 1
            updates.append(
                {
                    "id": row["player_id"],
                    "name": row["name"],
                    "slug": row["slug"],
                    "source": row["source"],
                    "archetype": None,
                    "archetype_confidence": None,
                    "percentiles": _percentiles_payload(row),
                }
            )
            continue

        # Classifier rules reference both percentile columns (e.g. `usg_pct_pct`)
        # and raw values (e.g. `usg_pct` for absolute Partnow-style cutoffs).
        # Pass both into the same lookup dict, scaling rate stats from 0..1
        # to 0..100 so a rule like `Rule("usg_pct", 30.0)` reads naturally.
        rule_inputs: dict[str, float | None] = {
            f"{col}_pct": row.get(f"{col}_pct") for col in PERCENTILE_SOURCES
        }
        for col in PERCENTILE_SOURCES:
            v = row.get(col)
            if v is None or pd.isna(v):
                rule_inputs[col] = None
                continue
            # Rate columns (0..1) get rescaled to 0..100 for human-readable
            # absolute thresholds. Counting stats (pts_per100, etc.) pass through.
            if col in {
                "ts_pct", "efg_pct", "fg_pct", "tp_pct", "ft_pct",
                "usg_pct", "ast_pct", "reb_pct", "oreb_pct", "dreb_pct",
                "stl_pct", "blk_pct", "tov_pct",
            }:
                rule_inputs[col] = float(v) * 100.0
            else:
                rule_inputs[col] = float(v)

        resolved_pos = _resolved_position(row)
        result = classify(rule_inputs, position=resolved_pos)
        if result.archetype is None:
            unclassified += 1
            archetype_value = None
            confidence_value = None
        else:
            counts[result.archetype.value] += 1
            archetype_value = result.archetype.value
            confidence_value = round(float(result.confidence), 4)

        # Partial-fit scores for the top 5 archetypes — surfaced in the UI when
        # the strict classifier returns None (e.g. Rodman → "70% glass cleaner")
        # and as a "also fits like..." section for clean matches.
        fits = fit_scores(rule_inputs, position=resolved_pos, top_n=5)
        fits_payload = [
            {"archetype": a.value, "score": round(s, 4)} for a, s in fits if s > 0.15
        ]

        percentiles = _percentiles_payload(row)
        percentiles["_fits"] = fits_payload

        # NOT NULL fields travel with the upsert; they're set to the current
        # value on conflict, which is a no-op.
        updates.append(
            {
                "id": row["player_id"],
                "name": row["name"],
                "slug": row["slug"],
                "source": row["source"],
                "archetype": archetype_value,
                "archetype_confidence": confidence_value,
                "percentiles": percentiles,
            }
        )

    print(f"Writing archetype for {len(updates)} players...")
    BATCH = 200
    for i in range(0, len(updates), BATCH):
        chunk = updates[i : i + BATCH]
        sb.table("players").upsert(chunk, on_conflict="id").execute()

    print("\nArchetype distribution:")
    for label, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {label:<28} {n}")
    print(f"  {'(unclassified)':<28} {unclassified}")
    print(f"  {'(skipped — irrelevant)':<28} {skipped_irrelevant}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.parse_args()
    run()


if __name__ == "__main__":
    main()
