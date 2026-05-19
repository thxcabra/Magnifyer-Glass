"""Tactical archetype classifier.

Each archetype is a tuple of strict pass/fail rules. A player matches an
archetype only when **every** rule passes. The classifier walks archetypes
in declared order — specific archetypes (Post-Up Hub, Helio-Centric Creator)
come BEFORE generic ones (Microwave Scorer) so a player like Shaq routes
to Post-Up Hub and never reaches the guard-only Microwave bucket.

Thresholds are calibrated against published basketball analytics:
- BBall-Index "Offensive Roles" and "Defensive Roles" framework
- Cleaning the Glass percentile bucketing and AST:USG diagnostic
- Public analyst convention (Partnow's 30%-USG heliocentric, the canonical
  35/40/20/15 cutoffs for 3-and-D, Pounding the Rock's role definitions)

See [memory/feedback_data_depth_and_archetype_accuracy.md] for the policy.

Position groups
---------------
We group on the player's `position` field:
- GUARDS = {PG, SG, G}
- WINGS  = {SF, G-F, F-G}            (a slasher / 3-and-D wing)
- FORWARDS = {SF, PF, F, F-G, F-C}   (point-forward eligible)
- BIGS = {C, PF, F-C, C-F}            (Post-Up Hub, Rim Protector, etc.)
- NON_BIGS = everything except pure-Big (C, F-C, C-F)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from app.models.schemas import Archetype

Direction = Literal["gte", "lte"]


GUARDS = frozenset({"PG", "SG", "G"})
WINGS = frozenset({"SG", "SF", "G-F", "F-G"})
PERIMETER = frozenset({"PG", "SG", "SF", "G", "G-F", "F-G"})  # guards + true wings
FORWARDS = frozenset({"SF", "PF", "F", "F-G", "F-C"})
BIGS = frozenset({"C", "PF", "F-C", "C-F", "F"})  # F included for stats-bigs (Rodman, Malone)
NON_BIGS = frozenset({"PG", "SG", "SF", "G", "F", "G-F", "F-G"})


@dataclass(frozen=True)
class Rule:
    metric: str
    threshold: float
    direction: Direction = "gte"


@dataclass(frozen=True)
class ArchetypeDef:
    label: Archetype
    rules: tuple[Rule, ...]
    requires_position: frozenset[str] = frozenset()
    description: str = ""


# Archetypes are evaluated in DECLARED ORDER. First match wins.
# Specific-before-generic — see the module docstring.
ARCHETYPES: tuple[ArchetypeDef, ...] = (
    # -------- Bigs (evaluate first so they can't slip into guard buckets) --
    # Split into three:
    #   * Playmaking Big — high USG, ELITE AST% (Jokić, Sabonis)
    #   * Post-Up Hub    — high USG, low AST%  (Shaq, Hakeem, Ewing)
    #   * Two-Way Anchor — moderate USG, elite defense (Duncan, Garnett)
    # Order matters: Helio tested FIRST so superstars (LeBron, KD, Giannis)
    # who happen to be classified position "F" don't get pulled into the
    # big-only bucket before Helio's strict USG+AST gate evaluates.
    ArchetypeDef(
        Archetype.helio_centric_creator,
        (
            Rule("usg_pct", 30.0),               # absolute: USG ≥ 30% (Partnow's strict cutoff)
            Rule("ast_pct", 25.0),               # absolute: AST ≥ 25%
            Rule("usg_pct_pct", 90),             # also top 10% by percentile
            Rule("minutes_total_pct", 82),       # starter gate — bench creators don't count
        ),
        requires_position=NON_BIGS,
        description=(
            "A primary initiator whose team's offense runs entirely through "
            "his on-ball decisions. USG ≥ 30% AND AST ≥ 25% — only the "
            "truest outliers: Harden, Luka, prime Westbrook, LeBron, Trae Young."
        ),
    ),
    # Then bigs: Playmaking Big tested first so Jokić doesn't fall to
    # Post-Up Hub; Post-Up Hub second; Two-Way Anchor catches the rest.
    ArchetypeDef(
        Archetype.playmaking_big,
        (
            Rule("usg_pct_pct", 70),
            Rule("ast_pct_pct", 85),     # ≥85th pct = elite assist rate for any position
            Rule("pts_per100_pct", 70),
            Rule("reb_pct_pct", 70),
        ),
        requires_position=BIGS,
        description=(
            "A high-usage big with elite passing — runs offense from the elbow "
            "or post. The center is the point guard. Jokić, Sabonis, prime Walton."
        ),
    ),
    ArchetypeDef(
        Archetype.post_up_hub,
        (
            Rule("usg_pct_pct", 80),
            Rule("pts_per100_pct", 85),
            Rule("ast_pct_pct", 50, "lte"),   # < median AST distinguishes from Playmaking Big
            Rule("tp_freq_pct", 30, "lte"),    # not a perimeter shooter
        ),
        requires_position=BIGS,
        description=(
            "A high-usage interior scorer. Backs down, dunks, finishes through "
            "contact — but doesn't pass much. Shaq, Hakeem, Ewing, prime Karl Malone."
        ),
    ),
    ArchetypeDef(
        Archetype.stretch_big,
        (
            Rule("tpa_per100_pct", 70),
            Rule("tp_pct_pct", 55),
            Rule("blk_per100_pct", 30),       # use per-100 not the empty *_pct column
        ),
        requires_position=BIGS,
        description=(
            "A big who spaces the floor with three-point volume. Karl-Anthony "
            "Towns, Brook Lopez, Porziņģis, prime Kevin Love."
        ),
    ),
    ArchetypeDef(
        Archetype.rim_protector,
        (
            Rule("blk_per100_pct", 80),        # NBA Advanced endpoint doesn't expose
            Rule("reb_pct_pct", 70),           # BLK%/STL% — use per-100 percentile instead
            Rule("usg_pct_pct", 60, "lte"),    # rim protectors are role players, not stars
            Rule("tpa_per100_pct", 30, "lte"),
        ),
        requires_position=BIGS,
        description=(
            "Vertical-spacing center who finishes lobs/putbacks and protects "
            "the basket. Rudy Gobert, Clint Capela, Tyson Chandler, peak Dwight."
        ),
    ),
    ArchetypeDef(
        Archetype.two_way_anchor,
        (
            Rule("usg_pct_pct", 50),           # captures everyone above role-player
            Rule("blk_per100_pct", 65),
            Rule("reb_pct_pct", 70),
        ),
        requires_position=BIGS,
        description=(
            "A fundamentally sound big who anchors defense and contributes "
            "across the board offensively without dominating usage. Duncan, "
            "Garnett, prime Robinson, peak Olajuwon."
        ),
    ),
    ArchetypeDef(
        Archetype.mobile_big,
        (
            Rule("stl_per100_pct", 70),
            Rule("ast_pct_pct", 60),
        ),
        requires_position=BIGS,
        description=(
            "Switchable big who defends 1-5 and connects offensively. Bam, "
            "Draymond, Al Horford, Anthony Davis, Jaren Jackson Jr."
        ),
    ),
    ArchetypeDef(
        Archetype.glass_cleaner,
        (
            Rule("reb_pct_pct", 90),
            Rule("usg_pct_pct", 70, "lte"),
        ),
        requires_position=BIGS,
        description=(
            "A specialist whose primary value is dominating the boards. "
            "Rodman, Ben Wallace, Drummond, Steven Adams."
        ),
    ),
    # -------- On-ball creators (forwards / guards, after Helio above) -------
    ArchetypeDef(
        Archetype.point_forward,
        (
            Rule("ast_pct_pct", 75),
            Rule("usg_pct_pct", 55),
        ),
        requires_position=FORWARDS,
        description=(
            "A forward-sized creator who initiates and orchestrates. Pippen, "
            "LeBron, Luka (positional fudge), Draymond's passing role."
        ),
    ),
    ArchetypeDef(
        Archetype.floor_general,
        (
            Rule("ast_pct_pct", 80),
            Rule("ast_to_ratio_pct", 70),
            Rule("usg_pct", 30.0, "lte"),   # absolute: keep stars below Helio's 30% line out
        ),
        requires_position=GUARDS,
        description=(
            "A pass-first lead guard who runs the offense at moderate usage "
            "with elite assist-to-turnover control. Chris Paul, Nash, Kidd, Haliburton."
        ),
    ),
    # -------- Wings / shooters ----------------------------------------------
    ArchetypeDef(
        Archetype.movement_shooter,
        (
            Rule("tpa_per100_pct", 80),
            Rule("tp_pct_pct", 75),
            Rule("usg_pct", 28.0, "lte"),    # Klay/Ray Allen sit at ~27% peak
        ),
        requires_position=PERIMETER,         # guards + wings — Pritchard fits here
        description=(
            "A wing whose offense comes off screens and hand-offs into threes. "
            "Klay Thompson, Reggie Miller, Ray Allen, JJ Redick."
        ),
    ),
    ArchetypeDef(
        Archetype.three_and_d,
        (
            Rule("tpa_per100_pct", 65),
            Rule("tp_pct_pct", 60),
            Rule("usg_pct", 25.0, "lte"),    # role-player USG ceiling
            Rule("ast_pct_pct", 50, "lte"),
        ),
        requires_position=PERIMETER,
        description=(
            "Off-ball wing who shoots threes efficiently in volume and defends "
            "perimeter scorers. Mikal Bridges, OG Anunoby, Bruce Bowen, Covington."
        ),
    ),
    ArchetypeDef(
        Archetype.slashing_wing,
        (
            Rule("pts_per100_pct", 75),
            Rule("ftr_pct", 70),
            Rule("tpa_per100_pct", 60, "lte"),
        ),
        requires_position=WINGS,
        description=(
            "Attacks the rim and dominates transition. Athletic finisher who "
            "draws fouls. Anthony Edwards, Ja Morant, prime DeMar."
        ),
    ),
    # -------- Defensive guard ------------------------------------------------
    ArchetypeDef(
        Archetype.lockdown_poa_defender,
        (
            Rule("stl_per100_pct", 80),
            Rule("usg_pct_pct", 60, "lte"),
        ),
        requires_position=GUARDS,
        description=(
            "A guard who pressures the opposing initiator at the point of "
            "attack. Marcus Smart, Jrue Holiday, Patrick Beverley, Gary Payton."
        ),
    ),
    # -------- Generic catch-alls (last so they never steal earlier matches) --
    ArchetypeDef(
        Archetype.microwave_scorer,
        (
            Rule("pts_per100_pct", 80),
            Rule("usg_pct_pct", 75),
            Rule("ast_pct_pct", 30, "lte"),
            # Bench gate — NBA Stats doesn't expose GS in any dashboard, so
            # we use minutes-per-game percentile as the starter/bench proxy.
            # Bench scorers (Lou Williams, Crawford, Vinnie) average <28 mpg.
            Rule("minutes_total_pct", 40, "lte"),
        ),
        requires_position=NON_BIGS,
        description=(
            "A high-usage bench scorer who generates points in short bursts. "
            "Lou Williams, Jamal Crawford, Vinnie 'Microwave' Johnson, Jordan Poole."
        ),
    ),
    ArchetypeDef(
        Archetype.connective_glue,
        (
            Rule("ast_pct_pct", 60),
            Rule("usg_pct_pct", 40, "lte"),
            Rule("ast_to_ratio_pct", 60),
        ),
        description=(
            "Low-usage utility — screens, smart cuts, connective passing. "
            "Royce O'Neale, late-career Iguodala, Josh Hart, peak Battier."
        ),
    ),
)


# ---------------------------------------------------------------------------
# Rule evaluation
# ---------------------------------------------------------------------------
def _rule_passes(value: float | None, rule: Rule) -> bool:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return False
    return value >= rule.threshold if rule.direction == "gte" else value <= rule.threshold


def _rule_margin(value: float, rule: Rule) -> float:
    """How comfortably a passed rule exceeds its threshold, normalized 0..1."""
    if rule.direction == "gte":
        return min(1.0, (value - rule.threshold) / max(100.0 - rule.threshold, 1.0))
    return min(1.0, (rule.threshold - value) / max(rule.threshold, 1.0))


@dataclass(frozen=True)
class Classification:
    archetype: Archetype | None
    confidence: float
    runner_up: Archetype | None
    runner_up_confidence: float


def fit_scores(
    percentile_row: dict, position: str | None = None, top_n: int = 5
) -> list[tuple[Archetype, float]]:
    """Score every position-eligible archetype by partial fit, return top N.

    Score = (rules_passed / total_rules) × (1 + mean_margin_of_passed_rules)/2,
    bounded to [0, 1]. A player matching every rule with comfortable margin
    scores near 1.0; one passing half the rules barely scores ~0.3.

    Used to surface "best fits" on profiles for players whose strict
    classification is None — e.g. Rodman shown as "70% Glass Cleaner,
    45% Connective Glue" rather than just "(none)".
    """
    scored: list[tuple[Archetype, float]] = []
    for arch in ARCHETYPES:
        if arch.requires_position and (position not in arch.requires_position):
            continue
        if not arch.rules:
            continue
        passed = 0
        margins: list[float] = []
        for rule in arch.rules:
            v = percentile_row.get(rule.metric)
            if _rule_passes(v, rule):
                passed += 1
                margins.append(_rule_margin(float(v), rule))
        pass_ratio = passed / len(arch.rules)
        margin = float(np.mean(margins)) if margins else 0.0
        score = pass_ratio * (0.5 + 0.5 * margin)
        if score > 0:
            scored.append((arch.label, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_n]


def classify(percentile_row: dict, position: str | None = None) -> Classification:
    """Walk archetypes in declared order. First fully-qualified archetype wins.

    Ordering matters: position-gated bigs come first, then on-ball creators,
    then wings, then generic guard archetypes (microwave, glue). This prevents
    a high-usage big like Shaq from cascading into a guard bucket.
    """
    qualified: list[tuple[Archetype, float]] = []

    for arch in ARCHETYPES:
        if arch.requires_position and (position not in arch.requires_position):
            continue

        margins: list[float] = []
        all_pass = True
        for rule in arch.rules:
            v = percentile_row.get(rule.metric)
            if not _rule_passes(v, rule):
                all_pass = False
                break
            margins.append(_rule_margin(float(v), rule))

        if all_pass and margins:
            qualified.append((arch.label, float(np.mean(margins))))

    if not qualified:
        return Classification(None, 0.0, None, 0.0)

    # First match wins (order-based). Runner-up is the next match in order.
    top, top_score = qualified[0]
    runner = qualified[1] if len(qualified) > 1 else (None, 0.0)
    return Classification(
        archetype=top,
        confidence=top_score,
        runner_up=runner[0],
        runner_up_confidence=runner[1],
    )
