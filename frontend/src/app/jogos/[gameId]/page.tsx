import type { Metadata } from "next";
import Link from "next/link";
import { api, type BoxScore } from "@/lib/api";
import { GameLiveView } from "@/components/game-live-view";
import { PageShell } from "@/components/section-card";
import { getServerT } from "@/lib/locale-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const { gameId } = await params;
  try {
    const box = await api.getGame(gameId, { cache: "no-store" });
    const away = box.away?.tricode;
    const home = box.home?.tricode;
    if (away && home) {
      return {
        title: `${away} @ ${home}`,
        description: `${away} ${box.away?.score ?? ""} @ ${home} ${box.home?.score ?? ""} — placar ao vivo, estatísticas e lance a lance.`,
        alternates: { canonical: `/jogos/${gameId}` },
      };
    }
  } catch {
    /* fall through to generic title */
  }
  return { title: `Jogo ${gameId}`, alternates: { canonical: `/jogos/${gameId}` } };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const { t } = await getServerT();

  let initialBox: BoxScore | undefined;
  try {
    initialBox = await api.getGame(gameId, { cache: "no-store" });
  } catch {
    initialBox = undefined;
  }

  return (
    <PageShell>
      <Link
        href="/jogos"
        className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex w-fit rounded-full border border-border px-3 py-1.5 text-sm transition-colors"
      >
        ← {t("games.title")}
      </Link>
      <GameLiveView gameId={gameId} initialBox={initialBox} />
    </PageShell>
  );
}
