import type { Metadata } from "next";

const AWARD_LABELS: Record<string, string> = {
  champion: "NBA Champions",
  mvp: "Most Valuable Player",
  finals_mvp: "Finals MVP",
  dpoy: "Defensive Player of the Year",
  roy: "Rookie of the Year",
  sixth_man: "Sixth Man of the Year",
  most_improved: "Most Improved Player",
  clutch_player: "Clutch Player of the Year",
  all_star_mvp: "All-Star Game MVP",
  all_nba_first: "All-NBA First Team",
  all_nba_second: "All-NBA Second Team",
  all_nba_third: "All-NBA Third Team",
  all_defensive_first: "All-Defensive First Team",
  all_defensive_second: "All-Defensive Second Team",
  all_rookie_first: "All-Rookie First Team",
  all_rookie_second: "All-Rookie Second Team",
  scoring_title: "Scoring Title",
  assists_title: "Assists Title",
  rebounding_title: "Rebounding Title",
  steals_title: "Steals Title",
  blocks_title: "Blocks Title",
  hof_inductee: "Hall of Fame Inductee",
};

function labelFor(award: string): string {
  if (AWARD_LABELS[award]) return AWARD_LABELS[award];
  return award
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ award: string }>;
}): Promise<Metadata> {
  const { award } = await params;
  const label = labelFor(award);
  return {
    title: `${label} — winners`,
    description: `Every ${label} honoree across NBA history, season by season, with team affiliation and tactical archetype.`,
    alternates: { canonical: `/lists/${award}` },
  };
}

export default function AwardListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
