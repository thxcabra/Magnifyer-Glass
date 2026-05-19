/**
 * Abbreviation → display name lookup. Used wherever we want to surface the
 * franchise's full name without hitting the backend (champion banners,
 * search results, hover cards). The frontend's k-bar already maintained a
 * similar list; centralizing it here keeps copy in sync.
 *
 * Includes both current franchises and the most common legacy abbreviations
 * the historical data uses (SEA → Supersonics, NJN → Nets, etc.) so we
 * don't render "SEA" as a fallback when a 1996 MVP rolls in.
 */

export const TEAM_FULL_NAME: Record<string, string> = {
  ATL: "Atlanta Hawks",
  BOS: "Boston Celtics",
  BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets",
  CHI: "Chicago Bulls",
  CLE: "Cleveland Cavaliers",
  DAL: "Dallas Mavericks",
  DEN: "Denver Nuggets",
  DET: "Detroit Pistons",
  GSW: "Golden State Warriors",
  HOU: "Houston Rockets",
  IND: "Indiana Pacers",
  LAC: "Los Angeles Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis Grizzlies",
  MIA: "Miami Heat",
  MIL: "Milwaukee Bucks",
  MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans",
  NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic",
  PHI: "Philadelphia 76ers",
  PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings",
  SAS: "San Antonio Spurs",
  TOR: "Toronto Raptors",
  UTA: "Utah Jazz",
  WAS: "Washington Wizards",
  // Legacy / relocated franchises - same lineage as their modern equivalent.
  SEA: "Seattle SuperSonics",
  NJN: "New Jersey Nets",
  NOH: "New Orleans Hornets",
  VAN: "Vancouver Grizzlies",
};

export function teamFullName(abbr: string | null | undefined): string {
  if (!abbr) return "-";
  return TEAM_FULL_NAME[abbr.toUpperCase()] ?? abbr;
}
