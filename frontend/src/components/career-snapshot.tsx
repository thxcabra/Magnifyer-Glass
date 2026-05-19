import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-logo";
import { getServerT } from "@/lib/locale-server";
import type { SeasonStats } from "@/lib/api";

interface CareerSnapshotProps {
  stats: SeasonStats[];
}

/** Computes a single career-high for a numeric key across regular-season rows. */
function bestSeason(
  stats: SeasonStats[],
  key: keyof SeasonStats,
): { value: number; season: string; team: string | null } | null {
  let best: { value: number; season: string; team: string | null } | null = null;
  for (const s of stats) {
    if (s.season_type !== "regular_season") continue;
    const v = s[key] as number | null | undefined;
    if (v === null || v === undefined) continue;
    if (!best || v > best.value) best = { value: v, season: s.season, team: s.team };
  }
  return best;
}

function fmt(n: number, digits = 1) {
  return n.toFixed(digits);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export async function CareerSnapshot({ stats }: CareerSnapshotProps) {
  const { t } = await getServerT();
  const rs = stats.filter((s) => s.season_type === "regular_season" && s.games_played);
  if (rs.length === 0) return null;

  const seasons = rs.length;
  const totalGames = rs.reduce((a, b) => a + (b.games_played ?? 0), 0);
  const sorted = [...rs].sort((a, b) => a.season.localeCompare(b.season));
  const firstSeason = sorted[0]?.season;
  const lastSeason = sorted[sorted.length - 1]?.season;

  // Tally teams the player suited up for (games_played weighted)
  const teamGames = new Map<string, number>();
  for (const s of rs) {
    if (!s.team) continue;
    teamGames.set(s.team, (teamGames.get(s.team) ?? 0) + (s.games_played ?? 0));
  }
  const teamsByGames = [...teamGames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const playoffRows = stats.filter((s) => s.season_type === "playoffs" && s.games_played);
  const playoffSeasons = new Set(playoffRows.map((s) => s.season)).size;
  const playoffGames = playoffRows.reduce((a, b) => a + (b.games_played ?? 0), 0);

  const bestPts = bestSeason(rs, "pts_per_game");
  const bestAst = bestSeason(rs, "ast_per_game");
  const bestReb = bestSeason(rs, "reb_per_game");
  const bestTs = bestSeason(rs, "ts_pct");
  const bestUsg = bestSeason(rs, "usg_pct");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{t("player.career_snapshot")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label={t("player.career_seasons")} value={seasons.toString()} />
          <Stat label={t("player.career_games")} value={totalGames.toString()} />
          <Stat
            label={t("player.career_span")}
            value={
              firstSeason && lastSeason
                ? firstSeason === lastSeason
                  ? firstSeason
                  : `${firstSeason} → ${lastSeason}`
                : "-"
            }
          />
          <Stat
            label={t("player.career_playoffs")}
            value={
              playoffSeasons > 0
                ? t(
                    playoffSeasons === 1 ? "player.career_runs" : "player.career_runs_plural",
                    { n: playoffSeasons, g: playoffGames },
                  )
                : "-"
            }
          />
        </div>

        {teamsByGames.length > 0 && (
          <div className="mt-6">
            <div className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
              {t("player.career_franchises")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {teamsByGames.map(([t, g]) => (
                <div
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs"
                >
                  <TeamLogo team={t} size={16} />
                  <span className="font-mono">{t}</span>
                  <span className="text-muted-foreground">{g}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
            {t("player.career_highs")}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CareerHigh label={t("axis.points")} best={bestPts} fmt={(v) => fmt(v)} />
            <CareerHigh label={t("axis.assists")} best={bestAst} fmt={(v) => fmt(v)} />
            <CareerHigh label={t("axis.rebounds")} best={bestReb} fmt={(v) => fmt(v)} />
            <CareerHigh label={t("axis.true_shooting")} best={bestTs} fmt={fmtPct} />
            <CareerHigh label={t("axis.usage")} best={bestUsg} fmt={fmtPct} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </div>
      <div className="font-mono text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function CareerHigh({
  label,
  best,
  fmt,
}: {
  label: string;
  best: { value: number; season: string; team: string | null } | null;
  fmt: (v: number) => string;
}) {
  if (!best) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b pb-1.5 last:border-0">
      <span className="text-sm">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-muted-foreground font-mono text-[11px]">
          {best.season}
          {best.team ? ` · ${best.team}` : ""}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {fmt(best.value)}
        </span>
      </span>
    </div>
  );
}
