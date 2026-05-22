"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamLogo } from "@/components/team-logo";
import { StatLegend } from "@/components/stat-legend";
import { useLocale } from "@/components/locale-provider";
import type { SeasonStats } from "@/lib/api";

type Mode = "per_game" | "per_100" | "advanced" | "shooting";
type Slate = "regular_season" | "playoffs" | "career";

interface Column {
  key: keyof SeasonStats;
  legend?: string;
  label: string;
  format: (v: number) => string;
}

const PER_GAME: Column[] = [
  { key: "pts_per_game", legend: "pts_per_game", label: "PPG", format: (v) => v.toFixed(1) },
  { key: "ast_per_game", legend: "ast_per_game", label: "APG", format: (v) => v.toFixed(1) },
  { key: "reb_per_game", legend: "reb_per_game", label: "RPG", format: (v) => v.toFixed(1) },
  { key: "stl_per_game", legend: "stl_per_game", label: "SPG", format: (v) => v.toFixed(1) },
  { key: "blk_per_game", legend: "blk_per_game", label: "BPG", format: (v) => v.toFixed(1) },
  { key: "tov_per_game", legend: "tov_per_game", label: "TOV", format: (v) => v.toFixed(1) },
  { key: "minutes_total", legend: "minutes_per_game", label: "MPG", format: (v) => v.toFixed(1) },
];

const PER_100: Column[] = [
  { key: "pts_per100", label: "PTS", format: (v) => v.toFixed(1) },
  { key: "ast_per100", label: "AST", format: (v) => v.toFixed(1) },
  { key: "reb_per100", label: "REB", format: (v) => v.toFixed(1) },
  { key: "stl_per100", label: "STL", format: (v) => v.toFixed(2) },
  { key: "blk_per100", label: "BLK", format: (v) => v.toFixed(2) },
  { key: "tov_per100", label: "TOV", format: (v) => v.toFixed(1) },
  { key: "tpa_per100", label: "3PA", format: (v) => v.toFixed(1) },
];

const ADVANCED: Column[] = [
  { key: "usg_pct", label: "USG%", format: (v) => (v * 100).toFixed(1) },
  { key: "ts_pct", label: "TS%", format: (v) => (v * 100).toFixed(1) },
  { key: "efg_pct", label: "eFG%", format: (v) => (v * 100).toFixed(1) },
  { key: "ast_pct", label: "AST%", format: (v) => (v * 100).toFixed(1) },
  { key: "reb_pct", label: "REB%", format: (v) => (v * 100).toFixed(1) },
  { key: "tov_pct", label: "TOV%", format: (v) => (v * 100).toFixed(1) },
];

const SHOOTING: Column[] = [
  { key: "fgm_per_game", legend: "fg_pct", label: "FGM", format: (v) => v.toFixed(1) },
  { key: "fga_per_game", legend: "fg_pct", label: "FGA", format: (v) => v.toFixed(1) },
  { key: "fg_pct", label: "FG%", format: (v) => (v * 100).toFixed(1) },
  { key: "tpm_per_game", legend: "tp_pct", label: "3PM", format: (v) => v.toFixed(1) },
  { key: "tpa_per_game", legend: "tp_pct", label: "3PA", format: (v) => v.toFixed(1) },
  { key: "tp_pct", label: "3P%", format: (v) => (v * 100).toFixed(1) },
  { key: "ftm_per_game", legend: "ft_pct", label: "FTM", format: (v) => v.toFixed(1) },
  { key: "fta_per_game", legend: "ft_pct", label: "FTA", format: (v) => v.toFixed(1) },
  { key: "ft_pct", label: "FT%", format: (v) => (v * 100).toFixed(1) },
];

const COLUMNS: Record<Mode, Column[]> = {
  per_game: PER_GAME,
  per_100: PER_100,
  advanced: ADVANCED,
  shooting: SHOOTING,
};

function aggregateCareer(rows: SeasonStats[]): SeasonStats[] {
  const regular = rows.filter((r) => r.season_type === "regular_season");
  if (regular.length === 0) return [];

  const totalGames = regular.reduce((sum, r) => sum + (r.games_played ?? 0), 0);
  if (totalGames === 0) return [];

  const career: Partial<SeasonStats> = {
    season: "Career",
    season_type: "regular_season",
    league: regular[0].league,
    team: null,
    games_played: totalGames,
  };

  const weighted = (k: keyof SeasonStats) => {
    let num = 0;
    let den = 0;
    for (const r of regular) {
      const v = r[k] as number | null | undefined;
      const w = r.games_played ?? 0;
      if (v !== null && v !== undefined && w > 0) {
        num += v * w;
        den += w;
      }
    }
    return den > 0 ? num / den : null;
  };

  const numericFields: (keyof SeasonStats)[] = [
    "minutes_total",
    "pts_per_game", "ast_per_game", "reb_per_game", "stl_per_game",
    "blk_per_game", "tov_per_game", "oreb_per_game", "dreb_per_game",
    "fgm_per_game", "fga_per_game", "fta_per_game", "ftm_per_game",
    "tpa_per_game", "tpm_per_game", "plus_minus_per_game",
    "pts_per100", "ast_per100", "reb_per100", "stl_per100", "blk_per100",
    "tov_per100", "fga_per100", "fta_per100", "tpa_per100",
    "ts_pct", "efg_pct", "fg_pct", "tp_pct", "ft_pct",
    "usg_pct", "ast_pct", "reb_pct", "oreb_pct", "dreb_pct",
    "stl_pct", "blk_pct", "tov_pct",
  ];
  for (const f of numericFields) {
    (career as Record<string, unknown>)[f] = weighted(f);
  }
  return [career as SeasonStats];
}

export function SeasonLog({ stats }: { stats: SeasonStats[] }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>("per_game");
  const [slate, setSlate] = useState<Slate>("regular_season");

  // Translated tab labels (mode + slate) - keys are in i18n.ts.
  const modeLabel: Record<Mode, string> = {
    per_game: t("season_log.mode.per_game"),
    per_100: t("season_log.mode.per_100"),
    advanced: t("season_log.mode.advanced"),
    shooting: t("season_log.mode.shooting"),
  };
  const slateLabel: Record<Slate, string> = {
    regular_season: t("season_log.slate.regular_season"),
    playoffs: t("season_log.slate.playoffs"),
    career: t("season_log.slate.career"),
  };

  const playoffSeasonsExist = useMemo(
    () => stats.some((s) => s.season_type === "playoffs"),
    [stats],
  );

  const filtered: SeasonStats[] = useMemo(() => {
    if (slate === "career") return aggregateCareer(stats);
    return stats.filter((s) => s.season_type === slate);
  }, [stats, slate]);

  const cols = COLUMNS[mode];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-4">
          <CardTitle className="text-base font-medium">{t("season_log.title")}</CardTitle>
          <Tabs value={slate} onValueChange={(v) => setSlate(v as Slate)}>
            <TabsList>
              <TabsTrigger value="regular_season" className="text-xs">{slateLabel.regular_season}</TabsTrigger>
              <TabsTrigger value="playoffs" className="text-xs" disabled={!playoffSeasonsExist}>
                {slateLabel.playoffs}
              </TabsTrigger>
              <TabsTrigger value="career" className="text-xs">{slateLabel.career}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            {(Object.keys(modeLabel) as Mode[]).map((m) => (
              <TabsTrigger key={m} value={m} className="text-xs">
                {modeLabel[m]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t("season_log.no_data", { slate: slateLabel[slate].toLowerCase() })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                  <th className="py-2 pr-3">{t("common.season")}</th>
                  <th className="py-2 pr-3">{t("common.team")}</th>
                  <th className="py-2 pr-3 text-right">GP</th>
                  {cols.map((c) => (
                    <th key={String(c.key)} className="py-2 pr-3 text-right">
                      <StatLegend metric={c.legend ?? String(c.key)} label={c.label} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {filtered.map((s) => {
                  const isCareer = s.season === "Career";
                  return (
                  <tr
                    key={`${s.season}-${s.season_type}-${s.league}`}
                    className={
                      "border-b last:border-0 " +
                      (isCareer
                        ? "border-t-2 border-primary bg-primary/5 font-semibold"
                        : "")
                    }
                  >
                    <td className="py-2 pr-3 font-sans">{s.season}</td>
                    <td className="py-2 pr-3 font-sans">
                      {s.team && s.season !== "Career" ? (
                        <Link
                          href={`/teams/${s.team}?season=${encodeURIComponent(s.season)}`}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          <TeamLogo team={s.team} size={16} />
                          {s.team}
                        </Link>
                      ) : (
                        s.team && (
                          <span className="inline-flex items-center gap-1.5">
                            <TeamLogo team={s.team} size={16} />
                            {s.team}
                          </span>
                        )
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">{s.games_played ?? "-"}</td>
                    {cols.map((c) => {
                      const v = s[c.key] as number | null | undefined;
                      return (
                        <td key={String(c.key)} className="py-2 pr-3 text-right">
                          {v !== null && v !== undefined ? c.format(v) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
