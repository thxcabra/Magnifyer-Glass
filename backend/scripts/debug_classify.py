"""Walk through classification for a single player and explain why each
archetype passes/fails. Useful when a star inexplicably gets (none)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.jobs.classify_archetypes import (  # noqa: E402
    PERCENTILE_SOURCES,
    compute_percentile_frame,
)
from app.services.archetypes import ARCHETYPES, _rule_passes  # noqa: E402
from app.services.features import load_player_features  # noqa: E402

RATE_COLS = {
    "ts_pct", "efg_pct", "fg_pct", "tp_pct", "ft_pct",
    "usg_pct", "ast_pct", "reb_pct", "oreb_pct", "dreb_pct",
    "stl_pct", "blk_pct", "tov_pct",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("name", help="substring match")
    args = parser.parse_args()

    df = load_player_features(is_nba=True)
    pct = compute_percentile_frame(df)
    row = pct[pct["name"].str.contains(args.name, na=False)]
    if row.empty:
        print(f"no match for {args.name!r}")
        return
    r = row.iloc[0]
    print(f"\n{r['name']}  pos={r.get('position')}  mpg={r.get('minutes_total')}\n")

    rule_inputs: dict[str, float | None] = {
        f"{col}_pct": r.get(f"{col}_pct") for col in PERCENTILE_SOURCES
    }
    for col in PERCENTILE_SOURCES:
        v = r.get(col)
        if v is None or pd.isna(v):
            rule_inputs[col] = None
            continue
        rule_inputs[col] = float(v) * 100.0 if col in RATE_COLS else float(v)

    for arch in ARCHETYPES:
        if arch.requires_position and (r.get("position") not in arch.requires_position):
            continue
        print(f"  [{arch.label.value}]")
        all_pass = True
        for rule in arch.rules:
            v = rule_inputs.get(rule.metric)
            passed = _rule_passes(v, rule)
            if not passed:
                all_pass = False
            v_str = "NaN" if v is None else f"{v:.2f}"
            print(
                f"    {'PASS' if passed else 'fail'}  {rule.metric:<22} "
                f"{rule.direction:<3} {rule.threshold:<6}  actual={v_str}"
            )
        if all_pass:
            print(f"    >>> MATCHES {arch.label.value}")
            break


if __name__ == "__main__":
    main()
