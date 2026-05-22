import type { Metadata } from "next";
import Link from "next/link";
import { api, type BoxScore } from "@/lib/api";
import { GameLiveView } from "@/components/game-live-view";
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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/jogos"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← {t("games.title")}
      </Link>
      <div className="mt-4">
        <GameLiveView gameId={gameId} initialBox={initialBox} />
      </div>
    </div>
  );
}
