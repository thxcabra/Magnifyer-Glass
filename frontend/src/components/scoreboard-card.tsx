"use client";

import Link from "next/link";
import { TeamLogo } from "@/components/team-logo";
import { useLocale } from "@/components/locale-provider";
import type { LiveGame } from "@/lib/api";
import {
  GAME_STATUS,
  formatClock,
  formatTipoffBrasilia,
  isOvertime,
} from "@/lib/live-format";

type T = (key: string, vars?: Record<string, string | number>) => string;

function periodLabel(t: T, period: number | null, status: number): string {
  const p = period ?? 0;
  if (status === GAME_STATUS.FINAL) {
    return isOvertime(p) ? t("live.final_ot") : t("live.final");
  }
  if (status === GAME_STATUS.LIVE) {
    if (p <= 4) return t("live.quarter", { n: p });
    const ot = p - 4;
    return ot === 1 ? t("live.ot") : t("live.ot_n", { n: ot });
  }
  return "";
}

function StatusBadge({ game, t }: { game: LiveGame; t: T }) {
  if (game.status === GAME_STATUS.SCHEDULED) {
    return (
      <span className="text-muted-foreground font-mono text-xs">
        {formatTipoffBrasilia(game.game_time_utc)}
      </span>
    );
  }
  if (game.status === GAME_STATUS.LIVE) {
    const clock = formatClock(game.game_clock);
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-red-500" />
        </span>
        {t("live.live")}
        <span className="text-muted-foreground font-mono">
          {periodLabel(t, game.period, game.status)}
          {clock ? ` · ${clock}` : ""}
        </span>
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
      {periodLabel(t, game.period, game.status)}
    </span>
  );
}

function TeamRow({
  team,
  winner,
  decided,
}: {
  team: LiveGame["home"];
  winner: boolean;
  decided: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo team={team.tricode} size={28} />
        <span
          className={
            "truncate text-sm " +
            (decided && !winner ? "text-muted-foreground" : "font-medium")
          }
        >
          {team.tricode}
        </span>
        {(team.wins !== null || team.losses !== null) && (
          <span className="text-muted-foreground hidden font-mono text-[10px] sm:inline">
            ({team.wins ?? 0}-{team.losses ?? 0})
          </span>
        )}
      </div>
      <span
        className={
          "font-mono text-lg tabular-nums " +
          (decided && winner ? "font-bold" : decided ? "text-muted-foreground" : "")
        }
      >
        {team.score ?? "-"}
      </span>
    </div>
  );
}

export function ScoreboardCard({ game }: { game: LiveGame }) {
  const { t } = useLocale();
  const started = game.status !== GAME_STATUS.SCHEDULED;
  const decided = game.status === GAME_STATUS.FINAL;
  const homeWin = (game.home.score ?? 0) > (game.away.score ?? 0);

  return (
    <Link
      href={`/jogos/${game.game_id}`}
      className="hover:bg-accent/40 block rounded-lg border bg-card p-4 transition-colors"
    >
      <div className="mb-3 flex items-center justify-between">
        <StatusBadge game={game} t={t} />
        <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
          {t("live.view_game")} →
        </span>
      </div>
      <div className="space-y-2">
        <TeamRow team={game.away} winner={!homeWin} decided={decided} />
        <TeamRow team={game.home} winner={homeWin} decided={decided} />
      </div>
      {started && (game.leaders.home || game.leaders.away) && (
        <div className="text-muted-foreground mt-3 border-t pt-2 text-[11px]">
          {[game.leaders.away, game.leaders.home]
            .filter((l): l is NonNullable<typeof l> => !!l && !!l.name)
            .map((l) => `${l.name} ${l.points ?? 0}pts`)
            .join(" · ")}
        </div>
      )}
    </Link>
  );
}
