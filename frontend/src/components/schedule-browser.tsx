"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScoreboardCard } from "@/components/scoreboard-card";
import { useLocale } from "@/components/locale-provider";
import type { ScheduleDate } from "@/lib/api";

function parseGameDate(s: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ScheduleBrowser({ dates }: { dates: ScheduleDate[] }) {
  const { t, locale } = useLocale();

  const days = useMemo(
    () =>
      dates
        .map((d) => ({ ...d, date: parseGameDate(d.game_date) }))
        .filter((d) => d.date && (d.games?.length ?? 0) > 0) as (ScheduleDate & {
        date: Date;
      })[],
    [dates],
  );

  const todayIdx = useMemo(() => {
    if (days.length === 0) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let best = 0;
    let bestDiff = Infinity;
    days.forEach((d, i) => {
      const diff = Math.abs(d.date.getTime() - now.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    });
    return best;
  }, [days]);

  const [idx, setIdx] = useState(todayIdx);

  if (days.length === 0) {
    return (
      <p className="text-muted-foreground mt-10 text-sm">{t("common.no_data")}</p>
    );
  }

  const safeIdx = Math.min(Math.max(idx, 0), days.length - 1);
  const cur = days[safeIdx];
  const label = cur.date.toLocaleDateString(
    locale === "pt-BR" ? "pt-BR" : "en-US",
    { weekday: "long", day: "2-digit", month: "long", year: "numeric" },
  );

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={safeIdx <= 0}
          className="hover:bg-accent inline-flex size-10 items-center justify-center rounded-md border disabled:opacity-40"
          aria-label="Anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold capitalize">{label}</div>
          {safeIdx !== todayIdx && (
            <button
              type="button"
              onClick={() => setIdx(todayIdx)}
              className="text-primary text-xs hover:underline"
            >
              {t("schedule.today")}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.min(days.length - 1, i + 1))}
          disabled={safeIdx >= days.length - 1}
          className="hover:bg-accent inline-flex size-10 items-center justify-center rounded-md border disabled:opacity-40"
          aria-label="Próximo"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cur.games.map((g) => (
          <ScoreboardCard key={g.game_id} game={g} />
        ))}
      </div>
    </div>
  );
}
