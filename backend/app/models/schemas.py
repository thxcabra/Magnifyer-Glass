from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PlayerSource(str, Enum):
    nba = "nba"
    ncaa = "ncaa"
    international = "international"
    g_league = "g_league"


class Archetype(str, Enum):
    helio_centric_creator = "helio_centric_creator"
    floor_general = "floor_general"
    microwave_scorer = "microwave_scorer"
    three_and_d = "three_and_d"
    lockdown_poa_defender = "lockdown_poa_defender"
    movement_shooter = "movement_shooter"
    slashing_wing = "slashing_wing"
    point_forward = "point_forward"
    connective_glue = "connective_glue"
    stretch_big = "stretch_big"
    rim_protector = "rim_protector"
    post_up_hub = "post_up_hub"
    playmaking_big = "playmaking_big"
    two_way_anchor = "two_way_anchor"
    mobile_big = "mobile_big"
    glass_cleaner = "glass_cleaner"


class Player(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    external_id: str | None = None
    source: PlayerSource
    name: str
    slug: str
    is_nba: bool = False
    position: str | None = None
    draft_class: int | None = None
    current_team: str | None = None
    born_on: date | None = None
    country: str | None = None
    college: str | None = None
    archetype: Archetype | None = None
    archetype_confidence: float | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PhysicalProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    player_id: UUID
    measured_on: date | None = None
    is_official: bool = False
    source_event: str | None = None
    height_no_shoes_in: float | None = None
    height_with_shoes_in: float | None = None
    weight_lbs: float | None = None
    wingspan_in: float | None = None
    standing_reach_in: float | None = None
    hand_length_in: float | None = None
    hand_width_in: float | None = None
    body_fat_pct: float | None = None
    vertical_leap_max_in: float | None = None
    vertical_leap_std_in: float | None = None
    lane_agility_sec: float | None = None
    three_quarter_sprint_sec: float | None = None
    bench_press_reps: int | None = None


class StatsNormalized(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    player_id: UUID
    season: str
    league: PlayerSource
    team: str | None = None
    games_played: int | None = None
    minutes_total: float | None = None
    pts_per100: float | None = None
    ast_per100: float | None = None
    reb_per100: float | None = None
    stl_per100: float | None = None
    blk_per100: float | None = None
    tov_per100: float | None = None
    fga_per100: float | None = None
    fta_per100: float | None = None
    tpa_per100: float | None = None
    tpm_per100: float | None = None
    ts_pct: float | None = None
    efg_pct: float | None = None
    fg_pct: float | None = None
    tp_pct: float | None = None
    ft_pct: float | None = None
    usg_pct: float | None = None
    ast_pct: float | None = None
    reb_pct: float | None = None
    oreb_pct: float | None = None
    dreb_pct: float | None = None
    stl_pct: float | None = None
    blk_pct: float | None = None
    tov_pct: float | None = None
    bpm: float | None = None
    obpm: float | None = None
    dbpm: float | None = None
    per: float | None = None
    ws_per_48: float | None = None


class SimilarityWeights(BaseModel):
    stats: float = Field(default=0.7, ge=0, le=1)
    phys: float = Field(default=0.3, ge=0, le=1)


class SimilarityMatch(BaseModel):
    player: Player
    similarity: float
    stats_component: float | None = None
    phys_component: float | None = None


class ComparisonResponse(BaseModel):
    prospect: Player
    matches: list[SimilarityMatch]
    weights: SimilarityWeights
