import type { Metadata } from "next";
import Image from "next/image";
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
import { NewsList } from "@/components/news-list";
import { GameLogTable } from "@/components/game-log-table";
import type { Archetype } from "@/lib/api";
import { api, type SeasonStats } from "@/lib/api";
import { getServerT } from "@/lib/locale-server";
import { ARCHETYPE_META } from "@/lib/stat-meta";
import { teamColors } from "@/lib/team-colors";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { player } = await api.getPlayerProfile(slug, {
      next: { revalidate: 60 },
    });
    const archetypeLabel = player.archetype
      ? ARCHETYPE_META[player.archetype]?.label
      : null;
    const role = archetypeLabel ? ` — ${archetypeLabel}` : "";
    const ctx = [
      player.position,
      player.current_team,
      player.draft_class ? `${player.draft_class} draft` : null,
      player.college,
      player.country,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      title: `${player.name}${role}`,
      description: `${player.name}${role}. ${ctx}. Stats, archetype classification, body composition, awards, and NBA comparisons on Magnifyer Glass.`,
      alternates: { canonical: `/players/${slug}` },
      openGraph: {
        type: "profile",
        title: `${player.name}${role}`,
        description: ctx,
        url: `/players/${slug}`,
      },
    };
  } catch {
    return { title: slug };
  }
}

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
  const { t, locale } = await getServerT();

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
  const teamColor = teamColors(displayTeam);

  // Free, attributed action photo from Wikimedia Commons (cached on the
  // backend). Falls back to the team-colored banner when there's none.
  // Photo + news both depend only on the player, so fetch them in parallel.
  const [photo, news] = await Promise.all([
    api
      .getPlayerPhoto(player.name, { next: { revalidate: 86400 } })
      .catch(() => null),
    api
      .getNews(`${player.name} NBA`, 6, locale, { next: { revalidate: 900 } })
      .then((r) => r.items)
      .catch(() => []),
  ]);
  const heroPhoto = photo?.url ?? null;

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
    <div>
      {/* Immersive team-tinted header banner */}
      <section className="relative isolate flex min-h-[300px] flex-col justify-end overflow-hidden border-b">
        {heroPhoto && (
          <Image
            src={heroPhoto}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_15%]"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(130% 130% at 0% 0%, ${teamColor.primary} 0%, transparent 55%)`,
          }}
        />
        {/* Solid theme background on the left fading to reveal the photo on the
            right, plus a fade to the page background at the bottom. Keeps the
            text theme-colored and readable in both light and dark. */}
        <div
          aria-hidden
          className="from-background via-background/70 to-background/20 absolute inset-0 bg-gradient-to-r"
        />
        <div
          aria-hidden
          className="to-background absolute inset-0 bg-gradient-to-t from-transparent via-transparent"
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-start gap-6 px-6 pt-10 pb-8">
          <PlayerHeadshot
            externalId={player.external_id}
            url={player.headshot_url}
            name={player.name}
            size={150}
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
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-4xl font-bold tracking-tight md:text-5xl">
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
        {photo?.url && (
          <a
            href={photo.source_url ?? photo.wiki_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-foreground absolute right-2 bottom-1 z-10 text-[10px]"
          >
            {photo.author ? `Foto: ${photo.author}` : "Foto"}
            {photo.license ? ` · ${photo.license}` : ""} · Wikimedia
          </a>
        )}
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
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

      {player.external_id && displayTeam && (
        <div className="mt-10">
          <h2 className="border-primary mb-3 border-l-4 pl-3 text-lg font-bold tracking-tight">
            {t("player.recent_games")}
          </h2>
          <GameLogTable externalId={player.external_id} team={displayTeam} />
        </div>
      )}

      {news.length > 0 && (
        <div className="mt-10">
          <h2 className="border-primary mb-3 border-l-4 pl-3 text-lg font-bold tracking-tight">
            {t("news.title")}
          </h2>
          <div className="rounded-lg border bg-card p-4">
            <NewsList items={news} locale={locale} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
