/**
 * Glossary for every metric and archetype the UI shows.
 *
 * Definitions sourced from:
 *   - Basketball-Reference Glossary (https://www.basketball-reference.com/about/glossary.html)
 *   - NBA Stats Glossary (https://www.nba.com/stats/help/glossary)
 *   - Cleaning the Glass methodology
 *   - BBall-Index "Offensive Roles" + "Defensive Roles" frameworks
 */

import type { Archetype } from "./api";

export interface StatMeta {
  label: string;            // human label shown in the UI
  short: string;            // 3-5 char abbreviation
  definition: string;       // plain-language definition
  why: string;              // why this stat matters / what it tells you
}

export const STAT_META: Record<string, StatMeta> = {
  // ---- Per-game (Basketball-Reference style) ----
  pts_per_game: {
    label: "Points per game",
    short: "PPG",
    definition: "Points scored per game.",
    why: "The classic counting stat. 20+ is starter-tier scoring; 30+ is All-Star volume.",
  },
  ast_per_game: {
    label: "Assists per game",
    short: "APG",
    definition: "Assists per game - passes that lead directly to a teammate's made basket.",
    why: "Playmaking volume. Lead guards usually post 6+; elite distributors 10+.",
  },
  reb_per_game: {
    label: "Rebounds per game",
    short: "RPG",
    definition: "Total rebounds per game (offensive + defensive).",
    why: "Glass control. Top bigs grab 10+ a night; perimeter rebounders 5–7.",
  },
  stl_per_game: {
    label: "Steals per game",
    short: "SPG",
    definition: "Steals per game.",
    why: "Disruptive defense. 1.5+ a night is active hands; 2+ is elite.",
  },
  blk_per_game: {
    label: "Blocks per game",
    short: "BPG",
    definition: "Shots blocked per game.",
    why: "Rim protection. 1.5+ is a real deterrent; 2+ is anchor territory.",
  },
  tov_per_game: {
    label: "Turnovers per game",
    short: "TOPG",
    definition: "Turnovers per game. Lower is better.",
    why: "Decision-making. Heavy-usage creators run 3.5–4.5; floor generals stay near 2.",
  },
  fga_per_game: {
    label: "Field-goal attempts per game",
    short: "FGA",
    definition: "Field-goal attempts per game (2s + 3s combined).",
    why: "Shot volume. 15+ a night usually marks a primary scoring option.",
  },
  fgm_per_game: {
    label: "Field-goal makes per game",
    short: "FGM",
    definition: "Field-goals made per game.",
    why: "Counting stat for makes; pair with FGA for shooting load.",
  },
  fta_per_game: {
    label: "Free-throw attempts per game",
    short: "FTA",
    definition: "Free-throw attempts per game.",
    why: "Foul-drawing skill - high-FTA players (8+) live at the line.",
  },
  ftm_per_game: {
    label: "Free-throw makes per game",
    short: "FTM",
    definition: "Free throws made per game.",
    why: "Free-throw conversion volume; pairs with FTA for free points.",
  },
  tpa_per_game: {
    label: "Three-point attempts per game",
    short: "3PA",
    definition: "Three-point attempts per game.",
    why: "Volume from beyond the arc. 7+ a night marks a high-volume shooter.",
  },
  tpm_per_game: {
    label: "Three-point makes per game",
    short: "3PM",
    definition: "Three-pointers made per game.",
    why: "Makes from deep; pair with 3PA for shooting load and efficiency.",
  },
  plus_minus_per_game: {
    label: "Plus/Minus per game",
    short: "+/-",
    definition: "Average point differential while the player is on the floor.",
    why: "Crude impact proxy. Positive means his team outscores opponents when he plays.",
  },
  minutes_per_game: {
    label: "Minutes per game",
    short: "MPG",
    definition: "Average minutes played per game.",
    why: "Role and trust signal. 30+ MPG is a clear starter; 18–24 is a rotation role.",
  },

  // ---- Per-100 possessions (analytical canonical) ----
  pts_per100: {
    label: "Points",
    short: "PTS",
    definition: "Points scored per 100 team possessions.",
    why: "Normalizes pace. 30+ per 100 is starter-tier; 38+ is All-Star scoring volume.",
  },
  ast_per100: {
    label: "Assists",
    short: "AST",
    definition: "Assists per 100 team possessions.",
    why: "Distinguishes playmakers from scorers. Lead guards typically clear 9–11 per 100.",
  },
  reb_per100: {
    label: "Rebounds",
    short: "REB",
    definition: "Total rebounds per 100 team possessions.",
    why: "Indicates whether a player crashes the glass. Top centers are 15+ per 100.",
  },
  stl_per100: {
    label: "Steals",
    short: "STL",
    definition: "Steals per 100 team possessions.",
    why: "Proxy for defensive activity and quick hands at the point of attack.",
  },
  blk_per100: {
    label: "Blocks",
    short: "BLK",
    definition: "Shots blocked per 100 team possessions.",
    why: "Rim-protection signal. Elite centers and weakside helpers clear 3+ per 100.",
  },
  tov_per100: {
    label: "Turnovers",
    short: "TOV",
    definition: "Turnovers per 100 team possessions.",
    why: "Lower is better. High-usage creators run 3.5–4.5 per 100.",
  },
  fga_per100: {
    label: "FGA",
    short: "FGA",
    definition: "Field-goal attempts per 100 team possessions.",
    why: "Shot volume. Combined with USG%, separates volume scorers from efficient role players.",
  },
  tpa_per100: {
    label: "3PA",
    short: "3PA",
    definition: "Three-point attempts per 100 team possessions.",
    why: "Volume from beyond the arc. 10+ per 100 marks a high-volume shooter.",
  },
  ts_pct: {
    label: "True Shooting %",
    short: "TS%",
    definition: "Shooting efficiency that weighs 2s, 3s, and free throws by their point value: PTS / (2 × (FGA + 0.44 × FTA)).",
    why: "Single best one-number efficiency metric. League average ~57%. 60%+ on volume is elite.",
  },
  efg_pct: {
    label: "Effective FG %",
    short: "eFG%",
    definition: "Field-goal percentage that gives three-pointers 1.5× weight: (FGM + 0.5 × 3PM) / FGA.",
    why: "Corrects raw FG% for shot location. Useful for comparing big men and snipers fairly.",
  },
  usg_pct: {
    label: "Usage %",
    short: "USG%",
    definition: "Percentage of team plays a player 'uses' (FGA + TOV + drawn FT) while on the floor.",
    why: "Measures offensive responsibility. Stars run 28–35%; role players 12–18%.",
  },
  ast_pct: {
    label: "Assist %",
    short: "AST%",
    definition: "Percentage of teammate field goals a player assists while on the floor.",
    why: "Playmaking load. Pure point guards exceed 35%; off-ball wings sit under 15%.",
  },
  reb_pct: {
    label: "Rebound %",
    short: "REB%",
    definition: "Percentage of available rebounds a player grabs while on the floor.",
    why: "Pace-independent rebounding. Elite glass-cleaners clear 18%+; perimeter players ~5–10%.",
  },
  oreb_pct: {
    label: "Offensive Reb %",
    short: "ORB%",
    definition: "Percentage of available offensive rebounds a player grabs while on the floor.",
    why: "Separates offensive boards (effort + position) from defensive boards (size).",
  },
  dreb_pct: {
    label: "Defensive Reb %",
    short: "DRB%",
    definition: "Percentage of available defensive rebounds a player grabs while on the floor.",
    why: "Dominant defensive bigs are 25%+; perimeter help-rebounders 10–15%.",
  },
  stl_pct: {
    label: "Steal %",
    short: "STL%",
    definition: "Percentage of opponent possessions ending in a steal while the player is on the floor.",
    why: "Activity defense. 2%+ indicates active hands; 3%+ is elite POA defender.",
  },
  blk_pct: {
    label: "Block %",
    short: "BLK%",
    definition: "Percentage of opponent two-point attempts blocked while the player is on the floor.",
    why: "Rim protection. 4–5% is a rim-protector; 7%+ is generational shot blocking.",
  },
  tov_pct: {
    label: "Turnover %",
    short: "TOV%",
    definition: "Estimated turnovers per 100 possessions used by the player.",
    why: "Decision-making proxy. Floor generals run 10–13%; turnover-prone creators 15%+.",
  },
  fg_pct: {
    label: "FG %",
    short: "FG%",
    definition: "Field-goal percentage: makes / attempts.",
    why: "Raw shooting accuracy. Mostly useful in zone-specific breakdowns.",
  },
  tp_pct: {
    label: "3-Point %",
    short: "3P%",
    definition: "Three-point percentage: 3PM / 3PA.",
    why: "Spacing skill. League average ~36%. 40%+ on volume is sniper-tier.",
  },
  ft_pct: {
    label: "FT %",
    short: "FT%",
    definition: "Free-throw percentage: FTM / FTA.",
    why: "Touch indicator. Often correlates with shooting projection for prospects.",
  },
  height_inches: {
    label: "Height",
    short: "HT",
    definition: "Height without shoes, in inches.",
    why: "Foundational for position and matchup expectations.",
  },
  wingspan_in: {
    label: "Wingspan",
    short: "WS",
    definition: "Arms-spread length from fingertip to fingertip.",
    why: "Defensive ceiling. +6\" or more over height is plus length; +9\" is freakish.",
  },
  standing_reach_in: {
    label: "Standing Reach",
    short: "SR",
    definition: "How high the player can touch with feet flat on the floor.",
    why: "What actually matters at the rim. 9'0\" + reach defends without leaving the floor.",
  },
  weight_lbs: {
    label: "Weight",
    short: "LB",
    definition: "Weight in pounds at measurement.",
    why: "Strength proxy. Combined with height, projects position viability.",
  },
  vertical_leap_max_in: {
    label: "Max Vertical",
    short: "VERT",
    definition: "Maximum vertical leap from a running start, measured in inches.",
    why: "Explosive athleticism. 36+ inches signals NBA-level bounce.",
  },
  lane_agility_sec: {
    label: "Lane Agility",
    short: "AGI",
    definition: "Time to complete the NBA Combine's lane-agility drill. Lower is better.",
    why: "Lateral quickness. Sub-11.0s is elite; bigs under 11.5s can switch.",
  },
  three_quarter_sprint_sec: {
    label: "¾ Sprint",
    short: "SPR",
    definition: "Time to sprint three-quarters of the court. Lower is better.",
    why: "Straight-line speed. Sub-3.2s is wing-level transition speed.",
  },
  confidence: {
    label: "Confidence",
    short: "CONF",
    definition:
      "How comfortably a player exceeds the archetype's percentile thresholds. 0 = barely qualifies; 1 = clears every threshold by the maximum margin.",
    why:
      "Lets you separate borderline matches from textbook ones. Archetype assignment with confidence < 0.3 is a soft fit; 0.7+ is a textbook example.",
  },
};

export interface ArchetypeMeta {
  label: string;
  description: string;
  exemplars: string;
}

export const ARCHETYPE_META: Record<Archetype, ArchetypeMeta> = {
  helio_centric_creator: {
    label: "Helio-Centric Creator",
    description:
      "A true outlier initiator: 30%+ usage AND 25%+ assist rate. The team's offense literally cannot function without him on the floor. Only a handful of players per decade qualify.",
    exemplars: "James Harden, Luka Dončić, peak Russell Westbrook, LeBron James, Trae Young",
  },
  floor_general: {
    label: "Floor General",
    description:
      "A pass-first lead guard who runs the offense at moderate usage with elite assist-to-turnover control. Decision-maker over scorer.",
    exemplars: "Chris Paul, Steve Nash, Jason Kidd, Tyrese Haliburton",
  },
  microwave_scorer: {
    label: "Microwave Scorer",
    description:
      "A high-usage bench guard who generates points in short bursts off self-creation. Bench gate is part of the definition.",
    exemplars: "Vinnie 'Microwave' Johnson, Lou Williams, Jamal Crawford, Jordan Poole",
  },
  three_and_d: {
    label: "3-and-D",
    description:
      "Off-ball wing who shoots threes efficiently in volume and defends opposing perimeter scorers. The modern role-player gold standard.",
    exemplars: "Bruce Bowen, Robert Covington, Mikal Bridges, OG Anunoby",
  },
  lockdown_poa_defender: {
    label: "Lockdown POA Defender",
    description:
      "A guard who pressures the opposing initiator at the point of attack with limited help responsibility.",
    exemplars: "Gary Payton, Marcus Smart, Jrue Holiday, Patrick Beverley",
  },
  movement_shooter: {
    label: "Movement Shooter",
    description:
      "Off-ball wing whose offense comes off screens, hand-offs, and constant motion into threes. Rarely stands still.",
    exemplars: "Reggie Miller, Ray Allen, Klay Thompson, JJ Redick",
  },
  slashing_wing: {
    label: "Slashing Wing",
    description:
      "A wing built around driving from the perimeter for rim attempts and free throws rather than spotting up.",
    exemplars: "Dwyane Wade, De'Aaron Fox, Ja Morant, Anthony Edwards",
  },
  point_forward: {
    label: "Point Forward",
    description:
      "A forward-sized player who initiates offense - handles, passes, and creates - in addition to scoring. Mismatch creator.",
    exemplars: "Scottie Pippen, LeBron James, Luka Dončić, Draymond Green",
  },
  connective_glue: {
    label: "Connective Glue",
    description:
      "Low-usage role player who keeps offense flowing through screens, smart cuts, and off-ball passing. The connector who makes everyone better.",
    exemplars: "Shane Battier, late-career Andre Iguodala, Royce O'Neale, Josh Hart",
  },
  stretch_big: {
    label: "Stretch Big",
    description:
      "A center or power forward whose offensive value is spacing the floor with three-point shooting.",
    exemplars: "Brook Lopez, Karl-Anthony Towns, Kristaps Porziņģis, Lauri Markkanen",
  },
  rim_protector: {
    label: "Rim Protector / Lob Threat",
    description:
      "Vertical-spacing center who scores almost entirely at the rim on rolls, lobs, and putbacks, and protects the basket on the other end.",
    exemplars: "Rudy Gobert, Clint Capela, prime Dwight Howard, Tyson Chandler",
  },
  post_up_hub: {
    label: "Post-Up Hub",
    description:
      "A high-usage interior scorer who backs down, dunks, and finishes through contact - but doesn't pass much. The classic dominant center.",
    exemplars: "Shaquille O'Neal, Hakeem Olajuwon, Patrick Ewing, prime Karl Malone, Moses Malone",
  },
  playmaking_big: {
    label: "Playmaking Big",
    description:
      "A high-usage big with elite passing - runs the offense from the elbow or post. The center is the point guard. Distinct from Post-Up Hub by an AST rate ~3x higher.",
    exemplars: "Nikola Jokić, Domantas Sabonis, prime Bill Walton, late-career Marc Gasol",
  },
  two_way_anchor: {
    label: "Two-Way Anchor",
    description:
      "A fundamentally sound big who anchors defense and contributes across the board offensively without dominating usage. Less alpha than a hub, more complete than a pure rim protector.",
    exemplars: "Tim Duncan, Kevin Garnett, prime David Robinson, peak Hakeem",
  },
  mobile_big: {
    label: "Mobile Big",
    description:
      "A switchable big who defends 1-5 and connects offensively. Bridges traditional center skills with modern positional fluidity.",
    exemplars: "Draymond Green, Bam Adebayo, Al Horford, Anthony Davis",
  },
  glass_cleaner: {
    label: "Glass Cleaner",
    description:
      "A big whose primary value is dominating the boards on both ends.",
    exemplars: "Dennis Rodman, Ben Wallace, Andre Drummond, Steven Adams",
  },
};
