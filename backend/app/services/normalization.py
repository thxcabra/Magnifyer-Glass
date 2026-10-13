"""Stat normalization helpers.

Converts raw box-score totals into Per-100-Possessions metrics and defines
the feature columns the archetype classifier consumes.
"""

from __future__ import annotations

# Columns we expose to downstream consumers. The archetype classifier needs
# the full set to compute derived ratios (tp_freq, ftr, ast_to_ratio, gs_ratio).
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
