import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BodyComp } from "@/components/body-comp";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { SeasonLog } from "@/components/season-log";
import { AwardsCard } from "@/components/awards-card";
import { ArchetypeFits } from "@/components/archetype-fits";
import { PlayerStatsBlock } from "@/components/player-stats-block";
import { CareerSnapshot } from "@/components/career-snapshot";
import type { Archetype } from "@/lib/api";
import { api, type SeasonStats } from "@/lib/api";
import { getServerT } from "@/lib/locale-server";

export const revalidate = 60;

/** Most-played team - used to label retired players by the franchise they're
 * known for. Sums regular-season games_played by team across the whole career
 * and picks the largest. */
function pickPrimaryTeam(stats: SeasonStats[]): { team: string; games: number } | null {
  const byTeam = new Map<string, number>();
  for (const s of stats) {
    if (s.season_type !== "regular_season") continue;
    if (!s.team || !s.games_played) continue;
    byTeam.set(s.team, (byTeam.get(s.team) ?? 0) + s.games_played);
  }
  let best: { team: string; games: number } | null = null;
  for (const [team, games] of byTeam) {
    if (!best || games > best.games) best = { team, games };
  }
  return best;
}

/** Most recent team - drives the "active" labeling. */
function pickLatestTeam(stats: SeasonStats[]): { team: string; season: string } | null {
  const rs = stats.filter((s) => s.season_type === "regular_season" && s.team);
  if (rs.length === 0) return null;
  const latest = rs.reduce((a, b) => (a.season > b.season ? a : b));
  return latest.team ? { team: latest.team, season: latest.season } : null;
}

function inchesToFeet(inches: number | null): string {
  if (inches === null) return "-";
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches - ft * 12);
  return `${ft}'${inch.toString().padStart(2, "0")}"`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t } = await getServerT();

  let profile;
  try {
    profile = await api.getPlayerProfile(slug, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }

  const { player, physical, stats, awards } = profile;

  const primary = pickPrimaryTeam(stats);
  const latest = pickLatestTeam(stats);
  const latestPlayerSeason = stats.find((s) => s.season_type === "regular_season")?.season ?? null;
  const startYear = (s: string | null) => (s ? parseInt(s.split("-")[0], 10) || 0 : 0);
  const ACTIVE_CUTOFF_YEAR = 2024;
  const isActive = startYear(latestPlayerSeason) >= ACTIVE_CUTOFF_YEAR;
  const displayTeam = isActive
    ? latest?.team ?? player.current_team ?? null
    : primary?.team ?? player.current_team ?? null;
  const displayTeamLabel = isActive ? null : primary ? t("player.most_played_for") : null;

  // Promote the highest-scoring partial fit when it's a clearer match than the
  // classifier's strict pick. `_fits` scores and `archetype_confidence` aren't
  // strictly the same scale, but the strict pick will always appear in `_fits`
  // (it passes every threshold), so its `_fits` score is a fair comparator -
  // the badge ends up displaying whichever archetype the rules-based scorer
  // thinks fits the most cleanly.
  const fits = (player.percentiles?._fits ?? []) as { archetype: Archetype; score: number }[];
  const topFit = fits[0] ?? null;
  const primaryArchetype = topFit?.archetype ?? player.archetype ?? null;
  const primaryConfidence = topFit
    ? topFit.score
    : player.archetype_confidence ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-6">
        <PlayerHeadshot
          externalId={player.external_id}
          url={player.headshot_url}
          name={player.name}
          size={128}
        />
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {player.is_nba ? t("player.is_nba") : t("player.is_prospect")}
            {player.draft_class && (
              <>
                {" · "}
                <Link
                  href={`/draft/${player.draft_class}`}
                  className="hover:text-foreground underline decoration-dotted underline-offset-2 transition-colors"
                >
                  {/* Draft year + pick number are left untranslated per the
                      project rule: numbers + draft labels are universal. */}
                  {player.draft_number
                    ? `${ordinal(player.draft_number)} pick, ${player.draft_class} draft`
                    : `${player.draft_class} draft`}
                </Link>
              </>
            )}
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-4xl font-semibold tracking-tight">
            {player.name}
            {player.jersey_number && (
              <span className="text-muted-foreground font-mono text-2xl">#{player.jersey_number}</span>
            )}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {player.position && <Badge variant="secondary">{player.position}</Badge>}
            {displayTeam && (
              <Link
                href={`/teams/${displayTeam}${latest && !isActive ? `?season=${encodeURIComponent(latest.season)}` : ""}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <TeamLogo team={displayTeam} size={20} />
                <span className="text-muted-foreground">
                  {displayTeamLabel && (
                    <span className="text-[10px] tracking-wide uppercase mr-1">
                      {displayTeamLabel}
                    </span>
                  )}
                  {displayTeam}
                </span>
              </Link>
            )}
            {player.height_inches && (
              <span className="text-muted-foreground">{inchesToFeet(player.height_inches)}</span>
            )}
            {player.college && (
              <Badge variant="outline" className="text-xs">
                {player.college}
              </Badge>
            )}
            {player.country && (
              <Badge variant="outline" className="text-xs">
                {player.country}
              </Badge>
            )}
          </div>
        </div>

        {(primaryArchetype || fits.length > 0) && (
          <div className="w-64 text-right">
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              {t("common.archetype")}
            </div>
            <div className="mt-1">
              {primaryArchetype ? (
                <ArchetypeBadge
                  archetype={primaryArchetype}
                  confidence={primaryConfidence}
                  size="lg"
                />
              ) : (
                <div className="text-muted-foreground text-sm italic">
                  {t("player.no_clean_fit")}
                </div>
              )}
            </div>
            {fits.length > 0 && (
              <div className="mt-3 text-left">
                <ArchetypeFits
                  fits={fits}
                  primary={primaryArchetype}
                  heading={t("player.also_fits_like")}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {!player.is_nba && (
        <div className="mt-6">
          <Link
            href={`/compare/${player.slug}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
          >
            {t("player.view_comparisons")}
          </Link>
        </div>
      )}

      <PlayerStatsBlock player={player} stats={stats} isActive={isActive} />

      {/* `items-start` stops the columns from stretching to match the tallest
          card; each card is now sized by its content, and the side-by-side
          layout flows naturally without forcing empty space below the
          shorter side. */}
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CareerSnapshot stats={stats} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">{t("player.body_composition")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Render BodyComp whenever we have ANY measurement (Combine wingspan
                  OR just the bio height). The component itself handles per-row
                  null fallbacks, so layout stays stable even when most of the
                  physical profile is empty. */}
              {physical || player.height_inches ? (
                <BodyComp
                  frames={[
                    {
                      name: player.name,
                      color: "#3b82f6",
                      height_in:
                        physical?.height_no_shoes_in ?? player.height_inches ?? null,
                      wingspan_in: physical?.wingspan_in ?? null,
                      standing_reach_in: physical?.standing_reach_in ?? null,
                      weight_lbs: physical?.weight_lbs ?? null,
                    },
                  ]}
                />
              ) : (
                <p className="text-muted-foreground text-sm">{t("player.body_no_data")}</p>
              )}
            </CardContent>
          </Card>

          {awards && awards.length > 0 && <AwardsCard awards={awards} />}
        </div>
      </div>

      <div className="mt-6">
        <SeasonLog stats={stats} />
      </div>
    </div>
  );
}
