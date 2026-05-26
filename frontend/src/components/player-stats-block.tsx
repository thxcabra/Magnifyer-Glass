"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PercentileBar } from "@/components/percentile-bar";
import { StatLegend } from "@/components/stat-legend";
import { StatTile } from "@/components/stat-tile";
import { useLocale } from "@/components/locale-provider";
import type { Player, SeasonStats } from "@/lib/api";

type Mode = "current" | "peak" | "career";

interface PlayerStatsBlockProps {
  player: Player;
  stats: SeasonStats[];
  /** True if the latest stats row falls within the active-window cutoff. */
  isActive: boolean;
}

/**
 * Axes shown in the Statistical profile card. `i18n` is the translation key
 * for the visible label (resolved at render time so it follows locale toggles);
 * `pctKey` is the per-100 percentile bucket, `legend` is the per-game stat-meta
 * tooltip - they intentionally differ (display per-game, percentile per-100).
 */
const AXES = [
  { key: "pts_per_game", legend: "pts_per_game", pctKey: "pts_per100", i18n: "axis.points", format: (v: number) => v.toFixed(1) },
  { key: "ast_per_game", legend: "ast_per_game", pctKey: "ast_per100", i18n: "axis.assists", format: (v: number) => v.toFixed(1) },
  { key: "reb_per_game", legend: "reb_per_game", pctKey: "reb_per100", i18n: "axis.rebounds", format: (v: number) => v.toFixed(1) },
  { key: "stl_per_game", legend: "stl_per_game", pctKey: "stl_per100", i18n: "axis.steals", format: (v: number) => v.toFixed(1) },
  { key: "blk_per_game", legend: "blk_per_game", pctKey: "blk_per100", i18n: "axis.blocks", format: (v: number) => v.toFixed(1) },
  { key: "ts_pct",       legend: "ts_pct",       pctKey: "ts_pct",     i18n: "axis.true_shooting", format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: "usg_pct",      legend: "usg_pct",      pctKey: "usg_pct",    i18n: "axis.usage", format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: "ast_pct",      legend: "ast_pct",      pctKey: "ast_pct",    i18n: "axis.ast_pct", format: (v: number) => `${(v * 100).toFixed(1)}%` },
] as const;

function pickLatest(stats: SeasonStats[]): SeasonStats | null {
  const rs = stats.filter((s) => s.season_type === "regular_season" && s.games_played);
  if (rs.length === 0) return null;
  return rs.reduce((a, b) => (a.season > b.season ? a : b));
}

function pickPeak(stats: SeasonStats[]): SeasonStats | null {
  const rs = stats.filter((s) => s.season_type === "regular_season" && s.games_played);
  if (rs.length === 0) return null;
  const score = (s: SeasonStats) =>
    (s.usg_pct ?? 0) * (s.games_played ?? 0) || (s.pts_per100 ?? 0) * (s.games_played ?? 0);
  return [...rs].sort((a, b) => score(b) - score(a))[0];
}

/** Weighted-by-games-played career averages across regular-season rows. */
function computeCareer(stats: SeasonStats[]): SeasonStats | null {
  const rs = stats.filter((s) => s.season_type === "regular_season" && s.games_played);
  if (rs.length === 0) return null;
  const totals: Record<string, number> = {};
  let games = 0;
  for (const s of rs) {
    const gp = s.games_played ?? 0;
    games += gp;
    for (const ax of AXES) {
      const v = s[ax.key as keyof SeasonStats] as number | null | undefined;
      if (v === null || v === undefined) continue;
      totals[ax.key] = (totals[ax.key] ?? 0) + v * gp;
    }
  }
  if (games === 0) return null;
  // Fabricate a synthetic SeasonStats row labeled "Career"
  const out: Partial<SeasonStats> = {
    season: "Career",
    season_type: "regular_season",
    team: null,
    games_played: games,
  };
  for (const ax of AXES) {
    if (totals[ax.key] !== undefined) {
      (out as Record<string, number | null>)[ax.key] = totals[ax.key] / games;
    } else {
      (out as Record<string, number | null>)[ax.key] = null;
    }
  }
  return out as SeasonStats;
}

export function PlayerStatsBlock({ player, stats, isActive }: PlayerStatsBlockProps) {
  const { t } = useLocale();
  const latest = useMemo(() => pickLatest(stats), [stats]);
  const peak = useMemo(() => pickPeak(stats), [stats]);
  const career = useMemo(() => computeCareer(stats), [stats]);

  const defaultMode: Mode = isActive && latest ? "current" : "peak";
  const [mode, setMode] = useState<Mode>(defaultMode);

  const active = mode === "current" ? latest : mode === "peak" ? peak : career;
  if (!active) {
    return (
      <p className="text-muted-foreground mt-8 text-sm">{t("player.no_stat_rows")}</p>
    );
  }

  const seasonStamp = `${active.season}${active.team ? ` · ${active.team}` : ""}`;
  const headerLabel =
    mode === "current"
      ? `${t("player.current_season")} · ${seasonStamp}`
      : mode === "peak"
        ? `${t("player.peak_season")} · ${seasonStamp}`
        : t("player.career_avgs");

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div className="text-muted-foreground text-xs tracking-wide uppercase">
          {headerLabel}
        </div>
        <ModeTabs mode={mode} setMode={setMode} hasCurrent={!!latest} hasPeak={!!peak} hasCareer={!!career} isActive={isActive} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatTile label="PPG" legend="pts_per_game" value={active.pts_per_game} format={(v) => v.toFixed(1)} accent />
        <StatTile label="APG" legend="ast_per_game" value={active.ast_per_game} format={(v) => v.toFixed(1)} />
        <StatTile label="RPG" legend="reb_per_game" value={active.reb_per_game} format={(v) => v.toFixed(1)} />
        <StatTile label="USG%" legend="usg_pct" value={active.usg_pct} format={(v) => (v * 100).toFixed(1)} />
        <StatTile label="TS%"  legend="ts_pct"  value={active.ts_pct}  format={(v) => (v * 100).toFixed(1)} />
        <StatTile label="AST%" legend="ast_pct" value={active.ast_pct} format={(v) => (v * 100).toFixed(1)} />
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {t("player.statistical_profile")}
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              {mode === "career" ? t("player.career_avgs") : seasonStamp}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {AXES.map((axis) => {
              const v = active[axis.key as keyof SeasonStats] as number | null | undefined;
              const pct = player.percentiles?.[axis.pctKey] ?? null;
              return (
                <PercentileBar
                  key={axis.key}
                  label={<StatLegend metric={axis.legend} label={t(axis.i18n)} />}
                  value={v}
                  percentile={pct}
                  format={axis.format}
                />
              );
            })}
            <p className="text-muted-foreground mt-4 text-xs">
              {t("player.statistical_profile_legend")}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ModeTabs({
  mode,
  setMode,
  hasCurrent,
  hasPeak,
  hasCareer,
  isActive,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  hasCurrent: boolean;
  hasPeak: boolean;
  hasCareer: boolean;
  isActive: boolean;
}) {
  const { t } = useLocale();
  // Hide the "Current" tab when the player is retired (no live season to show).
  const tabs: { value: Mode; label: string; enabled: boolean }[] = [
    { value: "current", label: t("player.tab_current"), enabled: hasCurrent && isActive },
    { value: "peak", label: t("player.tab_peak"), enabled: hasPeak },
    { value: "career", label: t("player.tab_career"), enabled: hasCareer },
  ];
  const shown = tabs.filter((t) => t.enabled);
  if (shown.length <= 1) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-0.5 text-xs">
      {shown.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => setMode(t.value)}
          className={
            "rounded-full px-3 py-1 font-medium transition-colors " +
            (mode === t.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
