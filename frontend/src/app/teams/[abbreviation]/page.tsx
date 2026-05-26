import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { StatLegend } from "@/components/stat-legend";
import { PageShell, SectionCard } from "@/components/section-card";
import { api } from "@/lib/api";
import { TEAM_LORE } from "@/lib/team-lore";
import { CollapsibleList } from "@/components/collapsible-list";
import { NewsList } from "@/components/news-list";
import { getServerT } from "@/lib/locale-server";
import { translate, type Locale } from "@/lib/i18n";
import { teamFullName } from "@/lib/team-names";
import { teamColors } from "@/lib/team-colors";

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ abbreviation: string }>;
  searchParams: Promise<{ season?: string }>;
}): Promise<Metadata> {
  const { abbreviation } = await params;
  const { season } = await searchParams;
  const fullName = teamFullName(abbreviation) || abbreviation;
  const seasonSuffix = season ? ` — ${season}` : "";
  const canonical = season
    ? `/teams/${abbreviation}?season=${encodeURIComponent(season)}`
    : `/teams/${abbreviation}`;
  return {
    title: `${fullName}${seasonSuffix}`,
    description: `${fullName}${seasonSuffix}. Roster, season-by-season stats, championship history, retired jerseys, and franchise lore on Magnifyer Glass.`,
    alternates: { canonical },
  };
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ abbreviation: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { abbreviation } = await params;
  const { season } = await searchParams;
  const { locale, t } = await getServerT();

  let data;
  try {
    data = await api.getTeam(abbreviation, season, { next: { revalidate: 60 } });
  } catch (e) {
    console.error("[team-page] failed to load", abbreviation, season, e);
    notFound();
  }

  const { team, season: activeSeason, seasons, roster, title_seasons, is_champion_this_season } = data;
  const lore = TEAM_LORE[team.abbreviation];
  const tc = teamColors(team.abbreviation);

  const news = await api
    .getNews(`${team.full_name} NBA`, 8, locale, { next: { revalidate: 900 } })
    .then((r) => r.items)
    .catch(() => []);

  return (
    <PageShell>
      {/* Immersive team-tinted header card */}
      <section className="bg-card relative isolate overflow-hidden rounded-3xl ring-1 ring-foreground/10">
        <div
          aria-hidden
          className="absolute inset-0 opacity-35"
          style={{
            background: `radial-gradient(130% 130% at 0% 0%, ${tc.primary} 0%, transparent 55%)`,
          }}
        />
        <div
          aria-hidden
          className="from-card via-card/75 absolute inset-0 bg-gradient-to-t to-transparent"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6 px-6 pt-10 pb-8">
          <div className="flex items-center gap-5">
            <TeamLogo team={team.abbreviation} size={104} />
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                {team.is_active ? t("team.franchise") : t("team.defunct")}
              </p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">{team.full_name}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {team.city}
              {team.year_founded ? ` · ${t("team.founded")} ${team.year_founded}` : ""}
              {" · "}
              <span className="font-mono">{team.abbreviation}</span>
              {lore?.head_coach && (() => {
                // The hardcoded coach is the CURRENT one. Only label it when
                // we're viewing the most recent seasons; otherwise the user
                // shouldn't think Doc Rivers coached the 2010 Celtics.
                const activeYear = activeSeason ? parseInt(activeSeason.split("-")[0], 10) : 0;
                const isRecent = activeYear >= 2024;
                return isRecent ? (
                  <>
                    {" · "}
                    {t("team.head_coach")}{" "}
                    <span className="text-foreground font-medium">{lore.head_coach}</span>
                  </>
                ) : null;
              })()}
            </p>
          </div>
        </div>

        {seasons.length > 0 && (
          <SeasonSelector
            abbreviation={team.abbreviation}
            seasons={seasons}
            active={activeSeason}
            titleSeasons={title_seasons}
            locale={locale}
          />
        )}
        </div>
      </section>

      <div className="mt-6 space-y-6">
      {title_seasons.length > 0 && (
        <ChampionshipsRow
          abbreviation={team.abbreviation}
          titleSeasons={title_seasons}
          activeIsChampion={is_champion_this_season}
          activeSeason={activeSeason}
          locale={locale}
        />
      )}

      {lore && (lore.notes || lore.retired_jerseys?.length) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {lore.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-medium">{t("team.about")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{lore.notes}</p>
              </CardContent>
            </Card>
          )}
          {lore.retired_jerseys && lore.retired_jerseys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">{t("team.retired_jerseys")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CollapsibleList initial={8}>
                  {lore.retired_jerseys.map((j, i) => (
                    <div
                      key={`${j.number}-${j.name}-${i}`}
                      className="flex items-baseline gap-3 text-sm"
                    >
                      <span className="text-primary w-8 shrink-0 font-mono text-xs font-semibold">
                        #{j.number}
                      </span>
                      {j.slug ? (
                        <Link
                          href={`/players/${j.slug}`}
                          className="hover:text-foreground transition-colors hover:underline"
                        >
                          {j.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{j.name}</span>
                      )}
                    </div>
                  ))}
                </CollapsibleList>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {is_champion_this_season && activeSeason && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-6"
          >
            <path d="M5 3v2.5C3.6 5.5 2.5 6.6 2.5 8c0 2.5 2.5 4 4.7 4.4.6 2 2.3 3.5 4.3 3.9V18H8v2h8v-2h-3.5v-1.7c2-.4 3.7-1.9 4.3-3.9 2.2-.4 4.7-1.9 4.7-4.4 0-1.4-1.1-2.5-2.5-2.5V3H5zm-2.5 5c0-.4.3-.7.7-.7H5v3c-1.2-.3-2.5-1-2.5-2.3zm17 0c0 1.3-1.3 2-2.5 2.3v-3h1.8c.4 0 .7.3.7.7z" />
          </svg>
          <div>
            <div className="font-semibold">{t("team.champion_banner_title", { season: activeSeason })}</div>
            <div className="text-sm">{t("team.champion_banner_sub")}</div>
          </div>
        </div>
      )}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-bold">
            {t("team.roster")}
            {activeSeason && (
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                {activeSeason}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {activeSeason
                ? t("team.no_roster", { team: team.full_name, season: activeSeason })
                : t("team.no_seasons")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                    <th className="py-2 pr-3">{t("common.player")}</th>
                    <th className="py-2 pr-3">{t("common.position")}</th>
                    <th className="py-2 pr-3 text-right">GP</th>
                    <th className="py-2 pr-3 text-right">
                      <StatLegend metric="minutes_per_game" label="MPG" />
                    </th>
                    <th className="py-2 pr-3 text-right">
                      <StatLegend metric="pts_per_game" label="PPG" />
                    </th>
                    <th className="py-2 pr-3 text-right">
                      <StatLegend metric="ast_per_game" label="APG" />
                    </th>
                    <th className="py-2 pr-3 text-right">
                      <StatLegend metric="reb_per_game" label="RPG" />
                    </th>
                    <th className="py-2 pr-3 text-right">
                      <StatLegend metric="usg_pct" label="USG%" />
                    </th>
                    <th className="py-2 pr-3 text-right">
                      <StatLegend metric="ts_pct" label="TS%" />
                    </th>
                    <th className="py-2 pr-3">{t("common.archetype")}</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {roster.map((row) => {
                    const p = row.player;
                    const s = row.season_stats;
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <Link
                            href={`/players/${p.slug}`}
                            className="flex items-center gap-2 font-sans hover:underline"
                          >
                            <PlayerHeadshot externalId={p.external_id} name={p.name} size={28} />
                            <span className="font-medium">{p.name}</span>
                            {p.jersey_number && (
                              <span className="text-muted-foreground text-xs">
                                #{p.jersey_number}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 font-sans">
                          {p.position && (
                            <Badge variant="secondary" className="text-xs">
                              {p.position}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right">{s.games_played ?? "-"}</td>
                        <td className="py-2 pr-3 text-right">{s.minutes_total?.toFixed(1) ?? "-"}</td>
                        <td className="py-2 pr-3 text-right">{s.pts_per_game?.toFixed(1) ?? "-"}</td>
                        <td className="py-2 pr-3 text-right">{s.ast_per_game?.toFixed(1) ?? "-"}</td>
                        <td className="py-2 pr-3 text-right">{s.reb_per_game?.toFixed(1) ?? "-"}</td>
                        <td className="py-2 pr-3 text-right">
                          {s.usg_pct !== null && s.usg_pct !== undefined
                            ? (s.usg_pct * 100).toFixed(1)
                            : "-"}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {s.ts_pct !== null && s.ts_pct !== undefined
                            ? (s.ts_pct * 100).toFixed(1)
                            : "-"}
                        </td>
                        <td className="py-2 pr-3 font-sans">
                          {p.archetype && (
                            <ArchetypeBadge archetype={p.archetype} size="sm" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {news.length > 0 && (
        <SectionCard title={t("news.title")}>
          <NewsList items={news} locale={locale} />
        </SectionCard>
      )}
      </div>
    </PageShell>
  );
}

function SeasonSelector({
  abbreviation,
  seasons,
  active,
  titleSeasons,
  locale,
}: {
  abbreviation: string;
  seasons: string[];
  active: string | null;
  titleSeasons: string[];
  locale: Locale;
}) {
  const titles = new Set(titleSeasons);
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-1.5 shrink-0 text-xs tracking-wide uppercase">
        {translate(locale, "common.season")}
      </span>
      <div className="flex max-w-2xl flex-wrap gap-1">
        {seasons.map((s) => {
          const isActive = s === active;
          const isTitle = titles.has(s);
          return (
            <Link
              key={s}
              href={`/teams/${abbreviation}?season=${s}`}
              title={isTitle ? translate(locale, "team.champion_banner_title", { season: s }) : undefined}
              className={
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs transition-colors " +
                (isActive
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent")
              }
            >
              {isTitle && <span aria-hidden>🏆</span>}
              {s}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ChampionshipsRow({
  abbreviation,
  titleSeasons,
  activeIsChampion,
  activeSeason,
  locale,
}: {
  abbreviation: string;
  titleSeasons: string[];
  activeIsChampion: boolean;
  activeSeason: string | null;
  locale: Locale;
}) {
  return (
    <div className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs tracking-wide uppercase">
          {translate(locale, "team.champions_count")} · {titleSeasons.length}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {titleSeasons.map((s) => {
            const isActive = activeIsChampion && s === activeSeason;
            return (
              <Link
                key={s}
                href={`/teams/${abbreviation}?season=${s}`}
                title={translate(locale, "team.champion_banner_title", { season: s })}
                className={
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors " +
                  (isActive
                    ? "border-amber-500 bg-amber-100 text-amber-900 dark:border-amber-400 dark:bg-amber-900/40 dark:text-amber-200"
                    : "border-border bg-card hover:bg-accent")
                }
              >
                {s}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
