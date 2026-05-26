"use client";

import Link from "next/link";
import { useApi } from "@/lib/swr";
import { useLocale } from "@/components/locale-provider";
import { formatMinutes } from "@/lib/live-format";
import type { GameLogRow } from "@/lib/api";

function shortDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

function fg(m: number | null, a: number | null): string {
  if (m === null && a === null) return "-";
  return `${m ?? 0}-${a ?? 0}`;
}

export function GameLogTable({
  externalId,
  team,
}: {
  externalId: string;
  team: string;
}) {
  const { t, locale } = useLocale();
  const { data, isLoading } = useApi<{ games: GameLogRow[] }>(
    `/game-log?external_id=${encodeURIComponent(externalId)}&team=${encodeURIComponent(team)}&limit=15`,
  );
  const games = data?.games ?? [];

  if (isLoading) {
    return (
      <div className="text-muted-foreground rounded-2xl bg-muted p-6 text-center text-sm">
        {t("common.loading")}
      </div>
    );
  }
  if (games.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl bg-muted">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-[10px] tracking-wide uppercase">
            <th className="py-2 pr-2 pl-3">{t("common.season")}</th>
            <th className="py-2 pr-2">{t("common.team")}</th>
            <th className="py-2 pr-2 text-center">W/L</th>
            <th className="py-2 pr-2 text-right">MIN</th>
            <th className="py-2 pr-2 text-right">PTS</th>
            <th className="py-2 pr-2 text-right">REB</th>
            <th className="py-2 pr-2 text-right">AST</th>
            <th className="py-2 pr-2 text-right">STL</th>
            <th className="py-2 pr-2 text-right">BLK</th>
            <th className="py-2 pr-2 text-right">FG</th>
            <th className="py-2 pr-2 text-right">3P</th>
            <th className="py-2 pr-2 text-right">FT</th>
            <th className="py-2 pr-3 text-right">+/-</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {games.map((g) => (
            <tr key={g.game_id} className="border-b last:border-0">
              <td className="py-2 pr-2 pl-3">{shortDate(g.date, locale)}</td>
              <td className="py-2 pr-2 font-sans">
                {g.game_id ? (
                  <Link href={`/jogos/${g.game_id}`} className="hover:underline">
                    {g.matchup}
                  </Link>
                ) : (
                  g.matchup
                )}
              </td>
              <td
                className={
                  "py-2 pr-2 text-center font-semibold " +
                  (g.wl === "W"
                    ? "text-green-500"
                    : g.wl === "L"
                      ? "text-red-500"
                      : "")
                }
              >
                {g.wl ?? "-"}
              </td>
              <td className="py-2 pr-2 text-right">{formatMinutes(g.min) || "-"}</td>
              <td className="py-2 pr-2 text-right font-semibold">{g.pts ?? "-"}</td>
              <td className="py-2 pr-2 text-right">{g.reb ?? "-"}</td>
              <td className="py-2 pr-2 text-right">{g.ast ?? "-"}</td>
              <td className="py-2 pr-2 text-right">{g.stl ?? "-"}</td>
              <td className="py-2 pr-2 text-right">{g.blk ?? "-"}</td>
              <td className="py-2 pr-2 text-right">{fg(g.fgm, g.fga)}</td>
              <td className="py-2 pr-2 text-right">{fg(g.tpm, g.tpa)}</td>
              <td className="py-2 pr-2 text-right">{fg(g.ftm, g.fta)}</td>
              <td className="py-2 pr-3 text-right">
                {g.plus_minus !== null
                  ? `${g.plus_minus > 0 ? "+" : ""}${g.plus_minus}`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
