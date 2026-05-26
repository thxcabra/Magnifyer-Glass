import type { Metadata } from "next";
import { api, type LiveScoreboard } from "@/lib/api";
import { ScoreboardGrid } from "@/components/scoreboard-grid";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { getServerT } from "@/lib/locale-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("games.title"),
    description: t("games.sub"),
    alternates: { canonical: "/jogos" },
  };
}

export default async function GamesPage() {
  const { t } = await getServerT();

  // Best-effort SSR snapshot for instant first paint; the client island then
  // polls every 15s. If the backend is unreachable, the island fetches itself.
  let initial: LiveScoreboard | undefined;
  try {
    initial = await api.getScoreboard({ cache: "no-store" });
  } catch {
    initial = undefined;
  }

  return (
    <PageShell>
      <PageHeader kicker={t("live.today")} title={t("games.title")} subtitle={t("games.sub")} />
      <SectionCard bodyClassName="-mt-6">
        <ScoreboardGrid initialData={initial} />
      </SectionCard>
    </PageShell>
  );
}
