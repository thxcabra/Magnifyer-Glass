const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type PlayerSource = "nba" | "ncaa" | "international" | "g_league";

export type Archetype =
  | "helio_centric_creator"
  | "floor_general"
  | "microwave_scorer"
  | "three_and_d"
  | "lockdown_poa_defender"
  | "movement_shooter"
  | "slashing_wing"
  | "point_forward"
  | "connective_glue"
  | "stretch_big"
  | "rim_protector"
  | "post_up_hub"
  | "playmaking_big"
  | "two_way_anchor"
  | "mobile_big"
  | "glass_cleaner";

export interface Player {
  id: string;
  external_id: string | null;
  name: string;
  slug: string;
  source: PlayerSource;
  is_nba: boolean;
  position: string | null;
  draft_class: number | null;
  draft_round: number | null;
  draft_number: number | null;
  jersey_number: string | null;
  height_inches: number | null;
  current_team: string | null;
  country: string | null;
  college: string | null;
  headshot_url: string | null;
  archetype: Archetype | null;
  archetype_confidence: number | null;
  /** Per-player percentile cache. Stat keys map to 0..100 numbers; the
   *  `_fits` key carries an array of partial archetype matches. */
  percentiles: (Record<string, number> & {
    _fits?: { archetype: Archetype; score: number }[];
  }) | null;
}

export interface PhysicalProfile {
  height_no_shoes_in: number | null;
  height_with_shoes_in: number | null;
  weight_lbs: number | null;
  wingspan_in: number | null;
  standing_reach_in: number | null;
  vertical_leap_max_in: number | null;
  lane_agility_sec: number | null;
  three_quarter_sprint_sec: number | null;
  is_official: boolean;
  source_event: string | null;
}

export type SeasonType = "regular_season" | "playoffs";

export interface SeasonStats {
  season: string;
  season_type: SeasonType;
  league: PlayerSource;
  team: string | null;
  games_played: number | null;
  minutes_total: number | null; // MPG, not totals - see backend loader docstring
  // Per-100 (analytical canonical)
  pts_per100: number | null;
  ast_per100: number | null;
  reb_per100: number | null;
  stl_per100: number | null;
  blk_per100: number | null;
  tov_per100: number | null;
  fga_per100: number | null;
  fta_per100: number | null;
  tpa_per100: number | null;
  // Per-game (Basketball-Reference style)
  pts_per_game: number | null;
  ast_per_game: number | null;
  reb_per_game: number | null;
  oreb_per_game: number | null;
  dreb_per_game: number | null;
  stl_per_game: number | null;
  blk_per_game: number | null;
  tov_per_game: number | null;
  fga_per_game: number | null;
  fgm_per_game: number | null;
  fta_per_game: number | null;
  ftm_per_game: number | null;
  tpa_per_game: number | null;
  tpm_per_game: number | null;
  plus_minus_per_game: number | null;
  // Advanced rates
  ts_pct: number | null;
  efg_pct: number | null;
  fg_pct: number | null;
  tp_pct: number | null;
  ft_pct: number | null;
  usg_pct: number | null;
  ast_pct: number | null;
  reb_pct: number | null;
  oreb_pct: number | null;
  dreb_pct: number | null;
  stl_pct: number | null;
  blk_pct: number | null;
  tov_pct: number | null;
}

export type AwardType =
  | "mvp"
  | "finals_mvp"
  | "dpoy"
  | "roy"
  | "sixth_man"
  | "most_improved"
  | "clutch_player"
  | "all_star"
  | "all_star_mvp"
  | "all_nba_first"
  | "all_nba_second"
  | "all_nba_third"
  | "all_defensive_first"
  | "all_defensive_second"
  | "all_rookie_first"
  | "all_rookie_second"
  | "scoring_title"
  | "assists_title"
  | "rebounding_title"
  | "steals_title"
  | "blocks_title"
  | "champion"
  | "hof_inductee";

export interface PlayerAward {
  award: AwardType;
  season: string | null;
  team_abbr: string | null;
  description: string | null;
}

export interface FullProfile {
  player: Player;
  physical: PhysicalProfile | null;
  stats: SeasonStats[];
  play_types: unknown[];
  hustle: Record<string, unknown> | null;
  awards: PlayerAward[];
}

export interface SimilarityMatch {
  player: Pick<
    Player,
    | "id"
    | "external_id"
    | "name"
    | "slug"
    | "position"
    | "current_team"
    | "is_nba"
    | "draft_class"
    | "jersey_number"
    | "archetype"
  >;
  similarity: number;
  stats_component: number | null;
  phys_component: number | null;
}

export interface ComparisonResponse {
  prospect: Player;
  matches: SimilarityMatch[];
  weights: { stats: number; phys: number };
}

export interface Team {
  id: number;
  abbreviation: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
  state: string | null;
  year_founded: number | null;
  is_active: boolean;
  conference: "East" | "West" | null;
  division: string | null;
}

export interface RosterEntry {
  player: Pick<
    Player,
    | "id"
    | "name"
    | "slug"
    | "external_id"
    | "position"
    | "jersey_number"
    | "height_inches"
    | "archetype"
    | "archetype_confidence"
  >;
  season_stats: {
    games_played: number | null;
    minutes_total: number | null;
    pts_per_game: number | null;
    ast_per_game: number | null;
    reb_per_game: number | null;
    usg_pct: number | null;
    ts_pct: number | null;
  };
}

export interface TeamResponse {
  team: Team;
  season: string | null;
  seasons: string[];
  title_seasons: string[];
  is_champion_this_season: boolean;
  roster: RosterEntry[];
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  searchPlayers: (q: string, limit = 10) =>
    get<
      Pick<
        Player,
        | "id"
        | "external_id"
        | "name"
        | "slug"
        | "position"
        | "draft_class"
        | "current_team"
        | "is_nba"
        | "source"
        | "jersey_number"
        | "headshot_url"
      >[]
    >(`/players/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getPlayer: (slug: string) => get<Player>(`/players/${encodeURIComponent(slug)}`),

  getPlayerProfile: (slug: string, init?: RequestInit) =>
    get<FullProfile>(`/players/${encodeURIComponent(slug)}/profile`, init),

  getComparison: (slug: string, init?: RequestInit) =>
    get<ComparisonResponse>(`/compare/${encodeURIComponent(slug)}`, init),

  listTeams: (includeLegacy = false) =>
    get<Team[]>(`/teams${includeLegacy ? "?include_legacy=true" : ""}`),

  listYears: () => get<string[]>("/years"),

  getSeasonLeaders: (season: string, init?: RequestInit) =>
    get<{
      season: string;
      leaders: Record<
        "points" | "assists" | "rebounds" | "steals" | "blocks",
        Array<{
          rank: number;
          value: number;
          games_played: number | null;
          team_abbr: string | null;
          player: Pick<
            Player,
            | "id"
            | "external_id"
            | "name"
            | "slug"
            | "position"
            | "current_team"
            | "is_nba"
            | "headshot_url"
            | "archetype"
            | "archetype_confidence"
          >;
        }>
      >;
    }>(`/years/${encodeURIComponent(season)}/leaders`, init),

  getYearSummary: (season: string, init?: RequestInit) => {
    type YPlayer = Pick<
      Player,
      | "id"
      | "external_id"
      | "name"
      | "slug"
      | "position"
      | "current_team"
      | "is_nba"
      | "headshot_url"
      | "archetype"
      | "archetype_confidence"
    >;
    type Honoree = {
      award: string;
      label: string;
      winner: YPlayer;
      team_abbr: string | null;
    };
    type StandingsRow = {
      team_abbr: string;
      conference: "East" | "West" | null;
      division: string | null;
      wins: number | null;
      losses: number | null;
      win_pct: number | null;
      conference_rank: number | null;
      division_rank: number | null;
      games_back: number | null;
      playoff_seed: number | null;
    };
    type PlayoffSeries = {
      round: "first_round" | "conf_semis" | "conf_finals" | "finals" | string;
      conference: "East" | "West" | null;
      higher_seed_abbr: string;
      lower_seed_abbr: string;
      winner_abbr: string;
      result: string | null;
      series_order: number;
    };
    return get<{
      season: string;
      draft_year: number;
      headlines: Honoree[];
      stat_titles: Honoree[];
      champion: { team_abbr: string; roster: YPlayer[] } | null;
      all_nba_first: YPlayer[];
      all_defensive_first: YPlayer[];
      team_squads: Record<string, YPlayer[]>;
      hof_inductees: YPlayer[];
      draft_size: number;
      top_picks: Array<
        YPlayer & Pick<Player, "draft_class" | "draft_round" | "draft_number">
      >;
      standings: { east: StandingsRow[]; west: StandingsRow[] };
      playoff_series: PlayoffSeries[];
    }>(`/years/${encodeURIComponent(season)}`, init);
  },

  listAwardTypes: () =>
    get<{ award: string; count: number }[]>(`/lists`),

  listAwardsByYear: (init?: RequestInit) =>
    get<{
      seasons: Array<{
        season: string;
        awards: Array<{
          award: string;
          entries: Array<{
            team_abbr: string | null;
            player: Pick<
              Player,
              | "id"
              | "external_id"
              | "name"
              | "slug"
              | "position"
              | "current_team"
              | "is_nba"
              | "headshot_url"
              | "archetype"
              | "archetype_confidence"
            >;
          }>;
        }>;
      }>;
    }>(`/lists/by-year/index`, init),

  getAwardHistory: (award: string, init?: RequestInit) =>
    get<{
      award: string;
      entries: Array<{
        season: string | null;
        team_abbr: string | null;
        player: Pick<Player, "id" | "external_id" | "name" | "slug" | "position" | "current_team" | "is_nba" | "headshot_url" | "archetype">;
      }>;
    }>(`/lists/${encodeURIComponent(award)}`, init),

  getTeam: (abbreviation: string, season?: string, init?: RequestInit) =>
    get<TeamResponse>(
      `/teams/${encodeURIComponent(abbreviation)}${season ? `?season=${encodeURIComponent(season)}` : ""}`,
      init,
    ),

  getDraftClass: (year: number, init?: RequestInit) =>
    get<{
      year: number;
      drafted: Array<
        Pick<
          Player,
          | "id"
          | "external_id"
          | "name"
          | "slug"
          | "position"
          | "draft_class"
          | "draft_round"
          | "draft_number"
          | "current_team"
          | "is_nba"
          | "source"
          | "headshot_url"
          | "archetype"
          | "archetype_confidence"
        > & { draft_team?: string | null }
      >;
      undrafted_count: number;
    }>(`/draft/${year}`, init),

  listProspects: (filters: {
    draft_class?: number;
    position?: string;
    archetype?: Archetype;
    include_nba?: boolean;
    has_archetype?: boolean;
    limit?: number;
    offset?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const tail = qs.toString();
    return get<Player[]>(`/discovery/prospects${tail ? `?${tail}` : ""}`);
  },
};

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  helio_centric_creator: "Helio-Centric Creator",
  floor_general: "Floor General",
  microwave_scorer: "Microwave Scorer",
  three_and_d: "3 & D",
  lockdown_poa_defender: "Lockdown POA",
  movement_shooter: "Movement Shooter",
  slashing_wing: "Slashing Wing",
  point_forward: "Point Forward",
  connective_glue: "Connective Glue",
  stretch_big: "Stretch Big",
  rim_protector: "Rim Protector",
  post_up_hub: "Post-Up Hub",
  playmaking_big: "Playmaking Big",
  two_way_anchor: "Two-Way Anchor",
  mobile_big: "Mobile Big",
  glass_cleaner: "Glass Cleaner",
};
