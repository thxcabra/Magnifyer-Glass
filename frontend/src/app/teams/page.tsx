import type { Metadata } from "next";
import { api } from "@/lib/api";
import { TeamsExplorer } from "@/components/teams-explorer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Teams",
  description:
    "Every active NBA franchise, split by conference. Browse rosters by season, championship history, retired jerseys, and franchise lore.",
  alternates: { canonical: "/teams" },
};

export default async function TeamsIndexPage() {
  const teams = await api.listTeams();
  return <TeamsExplorer teams={teams} />;
}
