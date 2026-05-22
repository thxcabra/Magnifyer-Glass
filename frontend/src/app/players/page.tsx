import type { Metadata } from "next";
import { api } from "@/lib/api";
import { PlayersExplorer } from "@/components/players-explorer";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Players",
  description:
    "Browse every NBA player in our catalog — filter by archetype, position, team, draft class, or college. Profiles include per-100 stats, advanced rates, percentile bars, and tactical-archetype classification.",
  alternates: { canonical: "/players" },
};

export default async function PlayersIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ archetype?: string }>;
}) {
  const { archetype } = await searchParams;

  // Two fetches: classified players first (ordered by archetype confidence)
  // then the unclassified bench/role pool. Merging gives the user a single
  // browsable list of 500+ NBA players in one shot.
  const [classified, unclassified] = await Promise.all([
    api.listProspects({
      include_nba: true,
      has_archetype: true,
      limit: 500,
    } as Parameters<typeof api.listProspects>[0]),
    api.listProspects({
      include_nba: true,
      has_archetype: false,
      limit: 300,
    } as Parameters<typeof api.listProspects>[0]),
  ]);

  return (
    <PlayersExplorer
      players={[...classified, ...unclassified]}
      initialArchetype={archetype ?? null}
    />
  );
}
