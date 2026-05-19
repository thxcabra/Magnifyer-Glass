import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { StatTitleLeaders } from "@/components/stat-title-leaders";
import { api } from "@/lib/api";
import { getServerT } from "@/lib/locale-server";
import { teamFullName } from "@/lib/team-names";

export const revalidate = 300;

type YearSummary = Awaited<ReturnType<typeof api.getYearSummary>>;
type YPlayer = YearSummary["all_nba_first"][number];

// Each squad maps to the same i18n key used elsewhere (award.*). We resolve
// the visible label at render time via the t() helper.
const SQUAD_I18N: Record<string, string> = {
  all_nba_first: "award.all_nba_first",
  all_nba_second: "award.all_nba_second",
  all_nba_third: "award.all_nba_third",
  all_defensive_first: "award.all_defensive_first",
  all_defensive_second: "award.all_defensive_second",
  all_rookie_first: "award.all_rookie_first",
  all_rookie_second: "award.all_rookie_second",
};

// Display order: prestige tiers grouped together.
const SQUAD_ORDER = [
  "all_nba_first",
  "all_nba_second",
  "all_nba_third",
  "all_defensive_first",
  "all_defensive_second",
  "all_rookie_first",
  "all_rookie_second",
];

const STAT_ICONS: Record<string, string> = {
  scoring_title: "🎯",
  assists_title: "🎁",
  rebounding_title: "🪣",
  steals_title: "🥊",
  blocks_title: "🛡️",
};

export default async function YearPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const { t } = await getServerT();

  let data: YearSummary;
  try {
    data = await api.getYearSummary(season, { next: { revalidate: 300 } });
  } catch {
    notFound();
  }

  const {
    season: seasonStr,
    draft_year,
    headlines,
    stat_titles,
    champion,
    team_squads,
    hof_inductees,
    top_picks,
    draft_size,
    standings,
    playoff_series,
  } = data;
  const hasStandings = (standings?.east?.length ?? 0) + (standings?.west?.length ?? 0) > 0;
  const hasPlayoffs = (playoff_series?.length ?? 0) > 0;
  const startYear = parseInt(seasonStr.split("-")[0], 10);
  const prevYear = startYear - 1;
  const nextYear = startYear + 1;
  const fmtSeason = (y: number) => `${y}-${(y + 1).toString().slice(-2)}`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("years.season")}</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">{seasonStr}</h1>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/years/${fmtSeason(prevYear)}`}
          className="text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm transition-colors"
        >
          ← {fmtSeason(prevYear)}
        </Link>
        <Link
          href="/years"
          className="text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm transition-colors"
        >
          {t("years.all_years")}
        </Link>
        <Link
          href={`/years/${fmtSeason(nextYear)}`}
          className="text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm transition-colors"
        >
          {fmtSeason(nextYear)} →
        </Link>
      </div>

      {champion && (
        <Card className="mt-8 border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-6">
            <div className="flex flex-wrap items-center gap-6">
              {/* Big team logo + name on the left */}
              <Link
                href={`/teams/${champion.team_abbr}?season=${encodeURIComponent(seasonStr)}`}
                className="group flex items-center gap-4"
              >
                <TeamLogo team={champion.team_abbr} size={96} />
                <div>
                  <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] text-amber-300 uppercase">
                    <span aria-hidden>🏆</span> {t("years.champions_label")} · {seasonStr}
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight transition-colors group-hover:underline">
                    {teamFullName(champion.team_abbr)}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {t("years.title_roster_hint", { n: champion.roster.length })}
                  </div>
                </div>
              </Link>

              {/* Preview of the title roster - first 8 headshots, link to the
                  full team-season page for the rest */}
              {champion.roster.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  {champion.roster.slice(0, 8).map((p) => (
                    <Link
                      key={p.id}
                      href={`/players/${p.slug}`}
                      title={p.name}
                      className="hover:ring-primary/40 inline-block rounded-full ring-2 ring-transparent transition-all"
                    >
                      <PlayerHeadshot
                        externalId={p.external_id}
                        url={p.headshot_url}
                        name={p.name}
                        size={40}
                      />
                    </Link>
                  ))}
                  {champion.roster.length > 8 && (
                    <Link
                      href={`/teams/${champion.team_abbr}?season=${encodeURIComponent(seasonStr)}`}
                      className="text-muted-foreground hover:text-foreground inline-flex size-10 items-center justify-center rounded-full border text-[10px] font-mono"
                    >
                      +{champion.roster.length - 8}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {headlines.length > 0 && (
        <section className="mt-8">
          <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("years.headline_winners")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {headlines.map((h) => (
              <HonoreeCard key={h.award} h={h} season={seasonStr} label={t(`award.${h.award}`)} />
            ))}
          </div>
        </section>
      )}

      {stat_titles && stat_titles.length > 0 && (
        <StatTitleLeaders
          season={seasonStr}
          titles={stat_titles.map((s) => ({
            award: s.award,
            label: t(`award.${s.award}`),
            team_abbr: s.team_abbr,
            winner: {
              id: s.winner.id,
              name: s.winner.name,
              slug: s.winner.slug,
              external_id: s.winner.external_id,
              headshot_url: s.winner.headshot_url,
            },
          }))}
        />
      )}

      {hasStandings && (
        <section className="mt-10">
          <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("years.final_standings")}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <StandingsTable title={t("years.eastern_conference")} rows={standings.east} season={seasonStr} />
            <StandingsTable title={t("years.western_conference")} rows={standings.west} season={seasonStr} />
          </div>
        </section>
      )}

      {hasPlayoffs && (
        <section className="mt-10">
          <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("years.playoff_bracket")}
          </h2>
          <PlayoffBracket
            series={playoff_series}
            season={seasonStr}
            labels={{
              first_round: t("years.first_round"),
              conf_semis: t("years.conf_semis"),
              conf_finals: t("years.conf_finals"),
              finals: t("years.finals"),
            }}
          />
        </section>
      )}

      {/* Every squad-style award we have, in two columns for density */}
      {SQUAD_ORDER.some((k) => (team_squads?.[k] ?? []).length > 0) && (
        <section className="mt-10">
          <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("years.awards_selections")}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {SQUAD_ORDER.filter((k) => (team_squads?.[k] ?? []).length > 0).map((k) => (
              <Card key={k}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t(SQUAD_I18N[k])}</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlayerRows players={team_squads[k]} season={seasonStr} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {hof_inductees && hof_inductees.length > 0 && (
        <section className="mt-10">
          <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("years.hof_inductees")} · {startYear}
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {hof_inductees.map((p) => (
              <Link
                key={p.id}
                href={`/players/${p.slug}`}
                className="hover:bg-accent/40 flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors"
              >
                <span className="text-xl" aria-hidden>🏛️</span>
                <PlayerHeadshot
                  externalId={p.external_id}
                  url={p.headshot_url}
                  name={p.name}
                  size={36}
                />
                <span className="truncate font-medium">{p.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {top_picks.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
              {t("years.top_picks", { year: draft_year })}
            </h2>
            <Link
              href={`/draft/${draft_year}`}
              className="text-muted-foreground hover:text-foreground text-xs underline decoration-dotted"
            >
              {t("years.full_class", { n: draft_size })}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
            {top_picks.map((p) => (
              <Link key={p.id} href={`/players/${p.slug}`}>
                <div className="hover:bg-accent/40 flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors">
                  <span className="text-primary w-8 text-right font-mono text-sm font-semibold">
                    #{p.draft_number}
                  </span>
                  <PlayerHeadshot
                    externalId={p.external_id}
                    url={p.headshot_url}
                    name={p.name}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                      {p.position && (
                        <Badge variant="secondary" className="text-[10px]">
                          {p.position}
                        </Badge>
                      )}
                      {p.current_team && (
                        <span className="inline-flex items-center gap-1">
                          <TeamLogo team={p.current_team} size={14} /> {p.current_team}
                        </span>
                      )}
                      {p.archetype && <ArchetypeBadge archetype={p.archetype} size="sm" />}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HonoreeCard({
  h,
  season,
  label,
}: {
  h: YearSummary["headlines"][number];
  season: string;
  /** Pre-translated award label. */
  label: string;
}) {
  return (
    <Link href={`/players/${h.winner.slug}`}>
      <Card className="hover:bg-accent/40 transition-colors">
        <CardContent className="flex items-center gap-3 py-4">
          <PlayerHeadshot
            externalId={h.winner.external_id}
            url={h.winner.headshot_url}
            name={h.winner.name}
            size={48}
          />
          <div className="min-w-0">
            <div className="text-muted-foreground text-[10px] tracking-wider uppercase">
              {label}
            </div>
            <div className="truncate font-semibold">{h.winner.name}</div>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              {h.team_abbr && (
                <span className="inline-flex items-center gap-1">
                  <TeamLogo team={h.team_abbr} size={14} /> {h.team_abbr}
                </span>
              )}
              {h.winner.position && (
                <Badge variant="secondary" className="text-[10px]">
                  {h.winner.position}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StandingsTable({
  title,
  rows,
  season,
}: {
  title: string;
  rows: YearSummary["standings"]["east"];
  season: string;
}) {
  if (!rows || rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-[10px] tracking-wide uppercase">
              <th className="py-1.5 pr-2 w-6">#</th>
              <th className="py-1.5 pr-2">Team</th>
              <th className="py-1.5 pr-2 text-right">W</th>
              <th className="py-1.5 pr-2 text-right">L</th>
              <th className="py-1.5 pr-2 text-right">PCT</th>
              <th className="py-1.5 pr-0 text-right">GB</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {rows.map((r) => (
              <tr key={r.team_abbr} className="border-b last:border-0">
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {r.conference_rank ?? "-"}
                </td>
                <td className="py-1.5 pr-2 font-sans">
                  <Link
                    href={`/teams/${r.team_abbr}?season=${encodeURIComponent(season)}`}
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    <TeamLogo team={r.team_abbr} size={16} />
                    <span className="font-medium">{r.team_abbr}</span>
                  </Link>
                </td>
                <td className="py-1.5 pr-2 text-right">{r.wins ?? "-"}</td>
                <td className="py-1.5 pr-2 text-right">{r.losses ?? "-"}</td>
                <td className="py-1.5 pr-2 text-right">
                  {r.win_pct !== null ? r.win_pct.toFixed(3).slice(1) : "-"}
                </td>
                <td className="py-1.5 pr-0 text-right">
                  {r.games_back !== null
                    ? r.games_back === 0
                      ? "-"
                      : r.games_back.toFixed(1)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function PlayoffBracket({
  series,
  season,
  labels,
}: {
  series: YearSummary["playoff_series"];
  season: string;
  labels: Record<"first_round" | "conf_semis" | "conf_finals" | "finals", string>;
}) {
  const rounds: { key: keyof typeof labels; label: string }[] = [
    { key: "first_round", label: labels.first_round },
    { key: "conf_semis", label: labels.conf_semis },
    { key: "conf_finals", label: labels.conf_finals },
    { key: "finals", label: labels.finals },
  ];
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {rounds.map((r) => {
        const matchups = series.filter((s) => s.round === r.key);
        if (matchups.length === 0) return null;
        return (
          <Card key={r.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{r.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {matchups.map((m, idx) => {
                const winner = m.winner_abbr;
                const loser =
                  m.winner_abbr === m.higher_seed_abbr
                    ? m.lower_seed_abbr
                    : m.higher_seed_abbr;
                return (
                  <div
                    key={`${m.round}-${m.higher_seed_abbr}-${m.lower_seed_abbr}-${idx}`}
                    className="rounded-md border bg-card px-2.5 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <Link
                        href={`/teams/${winner}?season=${encodeURIComponent(season)}`}
                        className="text-foreground inline-flex items-center gap-1.5 font-semibold hover:underline"
                      >
                        <TeamLogo team={winner} size={14} /> {winner}
                      </Link>
                      {m.result && (
                        <span className="text-primary font-mono">{m.result}</span>
                      )}
                    </div>
                    <Link
                      href={`/teams/${loser}?season=${encodeURIComponent(season)}`}
                      className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 hover:underline"
                    >
                      <TeamLogo team={loser} size={14} /> {loser}
                    </Link>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PlayerRows({
  players,
  season,
}: {
  players: YPlayer[];
  season: string;
}) {
  return (
    <ul className="divide-y">
      {players.map((p) => (
        <li key={p.id} className="py-1.5">
          <Link
            href={`/players/${p.slug}`}
            className="flex items-center gap-3 hover:underline"
          >
            <PlayerHeadshot
              externalId={p.external_id}
              url={p.headshot_url}
              name={p.name}
              size={28}
            />
            <span className="truncate text-sm font-medium">{p.name}</span>
            <span className="text-muted-foreground ml-auto inline-flex items-center gap-1.5 text-xs">
              {p.current_team && (
                <>
                  <TeamLogo team={p.current_team} size={14} /> {p.current_team}
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
