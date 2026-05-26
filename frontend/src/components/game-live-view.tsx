"use client";

import { useState } from "react";
import { useLive } from "@/lib/swr";
import { useLocale } from "@/components/locale-provider";
import { TeamLogo } from "@/components/team-logo";
import { BoxScoreTable } from "@/components/box-score-table";
import { PlayByPlayFeed } from "@/components/play-by-play-feed";
import { SectionCard } from "@/components/section-card";
import type { BoxScore, PlayByPlay } from "@/lib/api";
import { GAME_STATUS, formatClock, isOvertime } from "@/lib/live-format";

type T = (key: string, vars?: Record<string, string | number>) => string;

function statusLine(t: T, box: BoxScore): string {
  const p = box.period ?? 0;
  if (box.status === GAME_STATUS.SCHEDULED) return "";
  if (box.status === GAME_STATUS.FINAL) {
    return isOvertime(p) ? t("live.final_ot") : t("live.final");
  }
  const period =
    p <= 4
      ? t("live.quarter", { n: p })
      : p - 4 === 1
        ? t("live.ot")
        : t("live.ot_n", { n: p - 4 });
  const clock = formatClock(box.game_clock);
  return clock ? `${period} · ${clock}` : period;
}

export function GameLiveView({
  gameId,
  initialBox,
}: {
  gameId: string;
  initialBox?: BoxScore;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<"box" | "pbp">("box");

  const { data: box } = useLive<BoxScore>(`/live/games/${gameId}`, 20000, {
    fallbackData: initialBox,
    // Stop polling once the game is final.
    refreshInterval: (latest) =>
      latest?.status === GAME_STATUS.FINAL ? 0 : 20000,
  });

  const { data: pbp } = useLive<PlayByPlay>(
    tab === "pbp" ? `/live/games/${gameId}/playbyplay` : null,
    20000,
    {
      refreshInterval: () =>
        box?.status === GAME_STATUS.FINAL ? 0 : 20000,
    },
  );

  if (!box || (!box.home && !box.away)) {
    return (
      <p className="text-muted-foreground mt-12 text-center text-sm">
        {t("common.loading")}
      </p>
    );
  }

  const live = box.status === GAME_STATUS.LIVE;

  return (
    <div className="space-y-5">
      {/* Header: away @ home with scores */}
      <div className="bg-card flex items-center justify-center gap-6 rounded-3xl px-6 py-7 ring-1 ring-foreground/10">
        <TeamSide team={box.away} />
        <div className="text-center">
          {live && (
            <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-red-500">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              {t("live.live")}
            </span>
          )}
          <div className="text-muted-foreground font-mono text-xs">
            {statusLine(t, box)}
          </div>
          {box.arena && (
            <div className="text-muted-foreground mt-1 text-[10px]">{box.arena}</div>
          )}
        </div>
        <TeamSide team={box.home} />
      </div>

      <SectionCard>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <TabButton active={tab === "box"} onClick={() => setTab("box")}>
            {t("live.box_score")}
          </TabButton>
          <TabButton active={tab === "pbp"} onClick={() => setTab("pbp")}>
            {t("live.play_by_play")}
          </TabButton>
        </div>

        <div className="mt-5">
          {tab === "box" ? (
            <div className="grid gap-8 lg:grid-cols-2">
              {box.away && <BoxScoreTable team={box.away} />}
              {box.home && <BoxScoreTable team={box.home} />}
            </div>
          ) : (
            <PlayByPlayFeed actions={pbp?.actions ?? []} />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function TeamSide({ team }: { team: BoxScore["home"] }) {
  if (!team) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamLogo team={team.tricode} size={56} />
      <span className="text-sm font-medium">{team.tricode}</span>
      <span className="font-mono text-4xl font-bold tabular-nums">
        {team.score ?? "-"}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border-b-2 px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent")
      }
    >
      {children}
    </button>
  );
}
