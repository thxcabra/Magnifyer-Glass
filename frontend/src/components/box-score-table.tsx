"use client";

import { useLocale } from "@/components/locale-provider";
import { TeamLogo } from "@/components/team-logo";
import type { BoxScorePlayer, BoxScoreTeam } from "@/lib/api";
import { formatMinutes } from "@/lib/live-format";

function fmt(made: number | null, att: number | null): string {
  if (made === null && att === null) return "-";
  return `${made ?? 0}-${att ?? 0}`;
}

function Row({ p }: { p: BoxScorePlayer }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-3">
        <span className="font-sans font-medium">{p.name}</span>
        {p.position && (
          <span className="text-muted-foreground ml-1.5 text-[10px]">{p.position}</span>
        )}
      </td>
      <td className="py-1.5 pr-3 text-right">{formatMinutes(p.minutes) || "-"}</td>
      <td className="py-1.5 pr-3 text-right font-semibold">{p.points ?? "-"}</td>
      <td className="py-1.5 pr-3 text-right">{p.rebounds ?? "-"}</td>
      <td className="py-1.5 pr-3 text-right">{p.assists ?? "-"}</td>
      <td className="py-1.5 pr-3 text-right">{p.steals ?? "-"}</td>
      <td className="py-1.5 pr-3 text-right">{p.blocks ?? "-"}</td>
      <td className="py-1.5 pr-3 text-right">{fmt(p.fgm, p.fga)}</td>
      <td className="py-1.5 pr-3 text-right">{fmt(p.tpm, p.tpa)}</td>
      <td className="py-1.5 pr-3 text-right">{fmt(p.ftm, p.fta)}</td>
      <td className="py-1.5 pr-0 text-right">
        {p.plus_minus !== null
          ? `${p.plus_minus > 0 ? "+" : ""}${p.plus_minus}`
          : "-"}
      </td>
    </tr>
  );
}

export function BoxScoreTable({ team }: { team: BoxScoreTeam }) {
  const { t } = useLocale();
  const players = (team.players ?? []).filter((p) => p.played);
  const starters = players.filter((p) => p.starter);
  const bench = players.filter((p) => !p.starter);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <TeamLogo team={team.tricode} size={24} />
        <span className="font-medium">{team.name}</span>
        <span className="text-muted-foreground ml-auto font-mono text-lg font-bold tabular-nums">
          {team.score ?? "-"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs tabular-nums">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-[10px] tracking-wide uppercase">
              <th className="py-1.5 pr-3">{t("common.player")}</th>
              <th className="py-1.5 pr-3 text-right">MIN</th>
              <th className="py-1.5 pr-3 text-right">PTS</th>
              <th className="py-1.5 pr-3 text-right">REB</th>
              <th className="py-1.5 pr-3 text-right">AST</th>
              <th className="py-1.5 pr-3 text-right">STL</th>
              <th className="py-1.5 pr-3 text-right">BLK</th>
              <th className="py-1.5 pr-3 text-right">FG</th>
              <th className="py-1.5 pr-3 text-right">3P</th>
              <th className="py-1.5 pr-3 text-right">FT</th>
              <th className="py-1.5 pr-0 text-right">+/-</th>
            </tr>
          </thead>
          <tbody>
            {starters.length > 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="text-muted-foreground pt-2 pb-1 text-[10px] tracking-wide uppercase"
                >
                  {t("live.starters")}
                </td>
              </tr>
            )}
            {starters.map((p) => (
              <Row key={p.person_id} p={p} />
            ))}
            {bench.length > 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="text-muted-foreground pt-3 pb-1 text-[10px] tracking-wide uppercase"
                >
                  {t("live.bench")}
                </td>
              </tr>
            )}
            {bench.map((p) => (
              <Row key={p.person_id} p={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
