import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/**
 * Encode a single URL path segment exactly once. Next 16 hands dynamic route
 * params already URL-encoded (e.g. "nikola-joki%C4%87"), so a naive
 * encodeURIComponent would double-encode and 404 any slug with accents
 * (Dončić, Jokić, Šarić…). Decoding first makes this idempotent: it works
 * whether the caller passes a decoded slug from API data or an encoded one
 * from a route param.
 */
function seg(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    /* malformed % sequence — fall back to the raw value */
  }
  return encodeURIComponent(decoded);
}

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

// ---- Live data (cdn.nba.com via backend proxy) ----------------------------

export interface LiveTeamBrief {
  tricode: string | null;
  name: string | null;
  city: string | null;
  wins: number | null;
  losses: number | null;
  score: number | null;
}

export interface LiveLeader {
  name: string | null;
  tricode: string | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
}

export interface LiveGame {
  game_id: string;
  status: number; // 1=scheduled, 2=live, 3=final
  status_text: string | null;
  period: number | null;
  game_clock: string | null;
  game_time_utc: string | null;
  home: LiveTeamBrief;
  away: LiveTeamBrief;
  leaders: { home: LiveLeader | null; away: LiveLeader | null };
}

export interface LiveScoreboard {
  game_date: string | null;
  games: LiveGame[];
}

export interface BoxScorePlayer {
  person_id: number | null;
  name: string | null;
  jersey: string | null;
  position: string | null;
  starter: boolean;
  oncourt: boolean;
  played: boolean;
  minutes: string | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  fgm: number | null;
  fga: number | null;
  tpm: number | null;
  tpa: number | null;
  ftm: number | null;
  fta: number | null;
  plus_minus: number | null;
}

export interface BoxScoreTeam {
  tricode: string | null;
  name: string | null;
  city: string | null;
  score: number | null;
  players: BoxScorePlayer[];
}

export interface BoxScore {
  game_id: string;
  status: number | null;
  status_text: string | null;
  period: number | null;
  game_clock: string | null;
  arena: string | null;
  home: BoxScoreTeam | null;
  away: BoxScoreTeam | null;
}

export interface PlayByPlayAction {
  action_number: number | null;
  clock: string | null;
  period: number | null;
  team_tricode: string | null;
  description: string | null;
  score_home: string | null;
  score_away: string | null;
  action_type: string | null;
}

export interface PlayByPlay {
  game_id: string;
  actions: PlayByPlayAction[];
}

export interface ScheduleDate {
  game_date: string | null;
  games: LiveGame[];
}

export interface ScheduleResponse {
  game_dates: ScheduleDate[];
}

export interface PlayerPhoto {
  url: string | null;
  thumb_url?: string | null;
  author?: string | null;
  license?: string | null;
  license_url?: string | null;
  source_url?: string | null;
  wiki_url?: string | null;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string | null;
  published: string | null;
}

export interface StandingRow {
  rank: number;
  tricode: string;
  name: string | null;
  city: string | null;
  wins: number;
  losses: number;
  win_pct: number;
}

export interface StandingsResponse {
  east: StandingRow[];
  west: StandingRow[];
}

export interface PlayoffSeries {
  round: number;
  conference: "East" | "West" | "Finals";
  teams: { tricode: string; wins: number }[];
  winner: string | null;
}

export interface PlayoffsResponse {
  series: PlayoffSeries[];
}

export interface GameLogRow {
  game_id: string | null;
  date: string | null;
  matchup: string | null;
  wl: string | null;
  team_score: number | null;
  opp_score: number | null;
  min: string | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fgm: number | null;
  fga: number | null;
  tpm: number | null;
  tpa: number | null;
  ftm: number | null;
  fta: number | null;
  plus_minus: number | null;
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${path}`);
  }
  // Guard against a 200 response that isn't actually JSON (e.g. an HTML error
  // page from a misconfigured proxy). Without this, `res.json()` throws an
  // opaque SyntaxError that surfaces as a blank screen.
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(`Invalid JSON in response from ${path}`);
  }
}

/**
 * Runtime-validated fetch. `guard` is a loose Zod schema that asserts only the
 * fields the UI actually depends on — extra keys are preserved (looseObject),
 * so this never strips data, it only fails fast on a structurally broken
 * payload instead of letting `undefined.foo` crash deep in a render.
 */
async function getValidated<T>(
  path: string,
  guard: z.ZodType,
  init?: RequestInit,
): Promise<T> {
  const data = await get<unknown>(path, init);
  const parsed = guard.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Malformed response from ${path}: ${detail}`);
  }
  return parsed.data as T;
}

// Loose runtime guards. We require only the fields whose absence would break
// rendering (names used as headings, slugs used in links, arrays we map over).
const zPlayerCore = z.looseObject({
  name: z.string(),
  slug: z.string(),
});

const zFullProfile = z.looseObject({
  player: zPlayerCore,
  stats: z.array(z.unknown()),
  awards: z.array(z.unknown()),
});

const zTeamResponse = z.looseObject({
  team: z.looseObject({ abbreviation: z.string(), full_name: z.string() }),
  seasons: z.array(z.string()),
  roster: z.array(z.unknown()),
});

const zPlayerArray = z.array(zPlayerCore);

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

  getPlayer: (slug: string) => get<Player>(`/players/${seg(slug)}`),

  getPlayerProfile: (slug: string, init?: RequestInit) =>
    getValidated<FullProfile>(
      `/players/${seg(slug)}/profile`,
      zFullProfile,
      init,
    ),

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
    }>(`/years/${seg(season)}/leaders`, init),

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
    }>(`/years/${seg(season)}`, init);
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
    }>(`/lists/${seg(award)}`, init),

  getTeam: (abbreviation: string, season?: string, init?: RequestInit) =>
    getValidated<TeamResponse>(
      `/teams/${seg(abbreviation)}${season ? `?season=${seg(season)}` : ""}`,
      zTeamResponse,
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

  // Live data — server-side capable (used for SSR fallbackData); the browser
  // polls these directly via lib/swr.ts useLive().
  getScoreboard: (init?: RequestInit) =>
    get<LiveScoreboard>("/live/scoreboard", init),
  getGame: (gameId: string, init?: RequestInit) =>
    get<BoxScore>(`/live/games/${encodeURIComponent(gameId)}`, init),
  getPlayByPlay: (gameId: string, init?: RequestInit) =>
    get<PlayByPlay>(`/live/games/${encodeURIComponent(gameId)}/playbyplay`, init),
  getSchedule: (init?: RequestInit) =>
    get<ScheduleResponse>("/live/schedule", init),

  getStandings: (init?: RequestInit) =>
    get<StandingsResponse>("/live/standings", init),

  getPlayoffs: (init?: RequestInit) =>
    get<PlayoffsResponse>("/live/playoffs", init),

  getPlayerPhoto: (name: string, init?: RequestInit) =>
    get<PlayerPhoto>(`/photos/player?name=${encodeURIComponent(name)}`, init),

  getNews: (q: string, limit = 10, lang = "pt-BR", init?: RequestInit) =>
    get<{ items: NewsItem[] }>(
      `/news?q=${encodeURIComponent(q)}&limit=${limit}&lang=${encodeURIComponent(lang)}`,
      init,
    ),

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
    return getValidated<Player[]>(
      `/discovery/prospects${tail ? `?${tail}` : ""}`,
      zPlayerArray,
    );
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
