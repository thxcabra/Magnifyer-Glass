"""Stat normalization helpers.

Converts raw box-score totals into Per-100-Possessions metrics and produces
the feature matrix the similarity engine consumes.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# Columns we expose to downstream consumers. The similarity engine uses a
# subset of these; the archetype classifier needs the full set to compute
# derived ratios (tp_freq, ftr, ast_to_ratio, gs_ratio).
STATS_FEATURES: list[str] = [
    # Per-100 box volume
    "pts_per100",
    "ast_per100",
    "reb_per100",
    "stl_per100",
    "blk_per100",
    "tov_per100",
    "fga_per100",
    "fta_per100",
    "tpa_per100",
    # Rate stats
    "ts_pct",
    "efg_pct",
    "fg_pct",
    "tp_pct",
    "ft_pct",
    "usg_pct",
    "ast_pct",
    "reb_pct",
    "stl_pct",
    "blk_pct",
    "tov_pct",
    # Volume (for bench-gate derivation and tiebreakers)
    "games_played",
    "games_started",
    "minutes_total",
]

# Subset used by the similarity engine — the actual "style" vector.
SIMILARITY_STATS_FEATURES: list[str] = [
    "pts_per100",
    "ast_per100",
    "reb_per100",
    "stl_per100",
    "blk_per100",
    "tov_per100",
    "tpa_per100",
    "ts_pct",
    "efg_pct",
    "usg_pct",
    "ast_pct",
    "reb_pct",
    "stl_pct",
    "blk_pct",
    "tov_pct",
]

PHYS_FEATURES: list[str] = [
    "height_no_shoes_in",
    "weight_lbs",
    "wingspan_in",
    "standing_reach_in",
    "vertical_leap_max_in",
    "lane_agility_sec",
    "three_quarter_sprint_sec",
]


def estimate_possessions(
    *,
    fga: float,
    fta: float,
    tov: float,
    oreb: float,
) -> float:
    """Dean Oliver-style possession estimate for a single team-game."""
    return fga - oreb + tov + 0.44 * fta


def to_per_100(value: float, possessions: float) -> float:
    if possessions <= 0:
        return 0.0
    return (value / possessions) * 100.0


def fit_scaler(df: pd.DataFrame, columns: list[str]) -> MinMaxScaler:
    """Fit a MinMaxScaler on the given columns, filling NaNs with column median."""
    cleaned = df[columns].copy()
    cleaned = cleaned.fillna(cleaned.median(numeric_only=True))
    scaler = MinMaxScaler()
    scaler.fit(cleaned.values)
    return scaler


def transform_with_scaler(
    df: pd.DataFrame, columns: list[str], scaler: MinMaxScaler
) -> np.ndarray:
    cleaned = df[columns].copy()
    cleaned = cleaned.fillna(cleaned.median(numeric_only=True))
    return scaler.transform(cleaned.values)


# Lower-is-better physical metrics (agility, sprint) are inverted after scaling
# so "1.0" always means "elite" along every axis.
_INVERTED_PHYS = {"lane_agility_sec", "three_quarter_sprint_sec"}


def orient_phys(matrix: np.ndarray, columns: list[str]) -> np.ndarray:
    out = matrix.copy()
    for i, col in enumerate(columns):
        if col in _INVERTED_PHYS:
            out[:, i] = 1.0 - out[:, i]
    return out
