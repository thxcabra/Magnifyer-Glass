import { api } from "@/lib/api";
import { TeamsExplorer } from "@/components/teams-explorer";

export const revalidate = 3600;

export default async function TeamsIndexPage() {
  const teams = await api.listTeams();
  return <TeamsExplorer teams={teams} />;
}
