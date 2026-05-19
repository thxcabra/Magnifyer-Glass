import { api, type Archetype } from "@/lib/api";
import { DiscoveryExplorer } from "@/components/discovery-explorer";

export const revalidate = 60;

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    draft_class?: string;
    position?: string;
    archetype?: string;
  }>;
}) {
  const params = await searchParams;
  const archetype = params.archetype as Archetype | undefined;
  const players = await api.listProspects({
    draft_class: params.draft_class ? Number(params.draft_class) : undefined,
    position: params.position,
    archetype,
    limit: 200,
  });

  return (
    <DiscoveryExplorer
      players={players}
      activeArchetype={archetype ?? null}
      activeDraftClass={params.draft_class ? Number(params.draft_class) : null}
      activePosition={params.position ?? null}
    />
  );
}
