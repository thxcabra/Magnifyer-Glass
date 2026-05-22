import type { Metadata } from "next";
import { api, type LiveScoreboard } from "@/lib/api";
import { ScoreboardGrid } from "@/components/scoreboard-grid";
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
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {t("live.today")}
      </p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">
        {t("games.title")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("games.sub")}</p>

      <ScoreboardGrid initialData={initial} />
    </div>
  );
}
