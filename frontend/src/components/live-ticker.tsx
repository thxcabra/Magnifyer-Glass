"use client";

import Link from "next/link";
import { TeamLogo } from "@/components/team-logo";
import { useLocale } from "@/components/locale-provider";
import { useLive } from "@/lib/swr";
import type { LiveScoreboard } from "@/lib/api";
import { GAME_STATUS, formatClock, formatTipoffBrasilia } from "@/lib/live-format";

/**
 * Thin live scores strip under the nav. Polls every 15s, pauses when the tab
 * is hidden, and renders nothing when there are no games today (so it never
 * shows an empty bar).
 */
export function LiveTicker() {
  const { t } = useLocale();
  const { data } = useLive<LiveScoreboard>("/live/scoreboard", 15000);
  const games = data?.games ?? [];
  if (games.length === 0) return null;

  return (
    <div className="bg-card/60 border-b">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-1.5 sm:px-6">
        {games.map((g) => {
          const live = g.status === GAME_STATUS.LIVE;
          const sched = g.status === GAME_STATUS.SCHEDULED;
          return (
            <Link
              key={g.game_id}
              href={`/jogos/${g.game_id}`}
              className="hover:bg-accent/60 flex shrink-0 items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors"
              title={t("live.view_game")}
            >
              {live && (
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
              )}
              <span className="inline-flex items-center gap-1">
                <TeamLogo team={g.away.tricode} size={16} />
                <span className="font-mono">{g.away.tricode}</span>
                {!sched && (
                  <span className="font-mono font-semibold tabular-nums">
                    {g.away.score}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">@</span>
              <span className="inline-flex items-center gap-1">
                <TeamLogo team={g.home.tricode} size={16} />
                <span className="font-mono">{g.home.tricode}</span>
                {!sched && (
                  <span className="font-mono font-semibold tabular-nums">
                    {g.home.score}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground font-mono">
                {sched
                  ? formatTipoffBrasilia(g.game_time_utc)
                  : live
                    ? formatClock(g.game_clock) || t("live.live")
                    : t("live.final")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
