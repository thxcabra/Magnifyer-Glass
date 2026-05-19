"""Weighted cosine similarity engine.

Similarity = w_stats * cosine(stats_vec) + w_phys * cosine(phys_vec)

Vectors are MinMax-scaled per the active dataset before comparison so that
each dimension contributes proportionally and Per-100 metrics on wildly
different scales don't dominate.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from app.services.normalization import (
    PHYS_FEATURES,
    SIMILARITY_STATS_FEATURES as STATS_FEATURES,
    fit_scaler,
    orient_phys,
    transform_with_scaler,
)


@dataclass
class SimilarityResult:
    player_id: str
    similarity: float
    stats_component: float
    phys_component: float


class SimilarityEngine:
    """Pre-fit on a corpus (NBA pool), then query with prospect rows.

    Typical usage:
        engine = SimilarityEngine(weights=(0.7, 0.3))
        engine.fit(nba_df)
        matches = engine.match(prospect_row, top_n=10)
    """

    def __init__(self, weights: tuple[float, float] = (0.7, 0.3)) -> None:
        self.w_stats, self.w_phys = weights
        self._stats_scaler = None
        self._phys_scaler = None
        self._stats_matrix: np.ndarray | None = None
        self._phys_matrix: np.ndarray | None = None
        self._ids: list[str] = []

    def fit(self, corpus: pd.DataFrame) -> "SimilarityEngine":
        """Corpus must include 'player_id' + STATS_FEATURES + PHYS_FEATURES."""
        required = {"player_id", *STATS_FEATURES, *PHYS_FEATURES}
        missing = required - set(corpus.columns)
        if missing:
            raise ValueError(f"Corpus missing required columns: {sorted(missing)}")

        self._ids = corpus["player_id"].astype(str).tolist()

        self._stats_scaler = fit_scaler(corpus, STATS_FEATURES)
        self._phys_scaler = fit_scaler(corpus, PHYS_FEATURES)

        self._stats_matrix = transform_with_scaler(corpus, STATS_FEATURES, self._stats_scaler)
        phys_scaled = transform_with_scaler(corpus, PHYS_FEATURES, self._phys_scaler)
        self._phys_matrix = orient_phys(phys_scaled, PHYS_FEATURES)
        return self

    def _vectorize(self, row: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        assert self._stats_scaler is not None and self._phys_scaler is not None
        stats_vec = transform_with_scaler(row, STATS_FEATURES, self._stats_scaler)
        phys_vec = transform_with_scaler(row, PHYS_FEATURES, self._phys_scaler)
        phys_vec = orient_phys(phys_vec, PHYS_FEATURES)
        return stats_vec, phys_vec

    def match(self, prospect_row: pd.DataFrame, top_n: int = 10) -> list[SimilarityResult]:
        if self._stats_matrix is None or self._phys_matrix is None:
            raise RuntimeError("Engine has not been fit. Call .fit(corpus) first.")
        if len(prospect_row) != 1:
            raise ValueError("prospect_row must be a 1-row DataFrame")

        stats_vec, phys_vec = self._vectorize(prospect_row)

        stats_sim = cosine_similarity(stats_vec, self._stats_matrix)[0]
        phys_sim = cosine_similarity(phys_vec, self._phys_matrix)[0]
        combined = self.w_stats * stats_sim + self.w_phys * phys_sim

        order = np.argsort(-combined)[:top_n]
        return [
            SimilarityResult(
                player_id=self._ids[i],
                similarity=float(combined[i]),
                stats_component=float(stats_sim[i]),
                phys_component=float(phys_sim[i]),
            )
            for i in order
        ]
