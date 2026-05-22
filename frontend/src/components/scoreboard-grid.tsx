"use client";

import { useLive } from "@/lib/swr";
import { useLocale } from "@/components/locale-provider";
import { ScoreboardCard } from "@/components/scoreboard-card";
import type { LiveScoreboard } from "@/lib/api";

export function ScoreboardGrid({
  initialData,
}: {
  initialData?: LiveScoreboard;
}) {
  const { t } = useLocale();
  const { data, error } = useLive<LiveScoreboard>("/live/scoreboard", 15000, {
    fallbackData: initialData,
  });
  const games = data?.games ?? [];

  if (games.length === 0) {
    return (
      <div className="text-muted-foreground mt-12 text-center">
        <p className="text-sm">{t("live.no_games")}</p>
        <p className="mt-2 text-sm">{t("live.no_games_hint")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {error && !data && (
        <p className="text-muted-foreground mb-4 text-xs">
          {t("live.scoreboard_error")}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <ScoreboardCard key={g.game_id} game={g} />
        ))}
      </div>
    </div>
  );
}
