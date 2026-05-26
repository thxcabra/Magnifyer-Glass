"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { useLocale } from "@/components/locale-provider";
import { api } from "@/lib/api";

/**
 * /lists is now a single-mode "browse by award" view:
 *
 *   - Left column: every award type, plain text, no decorative emoji
 *     (the user asked us to keep emojis only on the detail title).
 *   - Right column: every winner of the selected award across seasons.
 *
 * The previous tab-based design with "By year" was removed per user feedback —
 * the /years page already covers the by-season slice of the same data.
 */

type AwardHistory = Awaited<ReturnType<typeof api.getAwardHistory>>["entries"];

// Emoji is intentionally retained ONLY for the detail-pane title. The award
// list in the sidebar stays text-only for visual cleanliness.
const AWARD_ICON: Record<string, string> = {
  champion: "🏆",
  mvp: "👑",
  finals_mvp: "🏅",
  dpoy: "🛡️",
  roy: "🌱",
  all_star_mvp: "✨",
  hof_inductee: "🏛️",
};

// Award browse order — mirrors the priority on player profiles.
const AWARD_ORDER = [
  "champion",
  "mvp",
  "finals_mvp",
  "dpoy",
  "roy",
  "sixth_man",
  "most_improved",
  "clutch_player",
  "all_star_mvp",
  "all_nba_first",
  "all_nba_second",
  "all_nba_third",
  "all_defensive_first",
  "all_defensive_second",
  "all_rookie_first",
  "all_rookie_second",
  "scoring_title",
  "assists_title",
  "rebounding_title",
  "steals_title",
  "blocks_title",
  "hof_inductee",
];

export default function ListsPage() {
  const { t } = useLocale();
  const [selectedAward, setSelectedAward] = useState<string>("mvp");
  const [history, setHistory] = useState<AwardHistory>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .getAwardHistory(selectedAward)
      .then((r) => setHistory(r.entries))
      .catch((err) => {
        console.error(err);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, [selectedAward]);

  return (
    <PageShell>
      <PageHeader kicker={t("nav.lists")} title={t("lists.title")} subtitle={t("lists.intro")}>
        <div className="w-full max-w-xs sm:w-56">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("lists.placeholder")}
            className="rounded-full"
          />
        </div>
      </PageHeader>

      <SectionCard>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AwardListColumn
            selected={selectedAward}
            onSelect={setSelectedAward}
            heading={t("lists.awards_heading")}
          />
          <AwardDetail
            award={selectedAward}
            entries={history}
            loading={loading}
            query={query.trim().toLowerCase()}
            t={t}
          />
        </div>
      </SectionCard>
    </PageShell>
  );
}

function AwardListColumn({
  selected,
  onSelect,
  heading,
}: {
  selected: string;
  onSelect: (a: string) => void;
  heading: string;
}) {
  const { t } = useLocale();
  return (
    <aside className="space-y-1.5">
      <h2 className="text-muted-foreground text-xs tracking-wide uppercase">{heading}</h2>
      <div className="space-y-0.5">
        {AWARD_ORDER.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onSelect(a)}
            className={
              "block w-full rounded-full px-3 py-1.5 text-left text-sm transition-colors " +
              (selected === a
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
            }
          >
            {t(`award.${a}`)}
          </button>
        ))}
      </div>
    </aside>
  );
}

function AwardDetail({
  award,
  entries,
  loading,
  query,
  t,
}: {
  award: string;
  entries: AwardHistory;
  loading: boolean;
  query: string;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  if (loading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  const filtered = query
    ? entries.filter(
        (e) =>
          e.player.name.toLowerCase().includes(query) ||
          (e.team_abbr ?? "").toLowerCase().includes(query) ||
          (e.season ?? "").toLowerCase().includes(query),
      )
    : entries;

  const label = t(`award.${award}`);
  const icon = AWARD_ICON[award];

  // Champions are a team-centric view: one card per (season, team).
  if (award === "champion") {
    return (
      <ChampionsList
        entries={filtered}
        label={label}
        icon={icon}
        emptyText={t("common.no_matches")}
        countText={t("lists.honorees_count", { n: filtered.length })}
      />
    );
  }

  const grouped = new Map<string, AwardHistory>();
  for (const e of filtered) {
    const s = e.season ?? "-";
    if (!grouped.has(s)) grouped.set(s, []);
    grouped.get(s)!.push(e);
  }
  const seasons = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <section className="space-y-6">
      <div className="border-b pb-2">
        <h2 className="font-heading inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
          {icon && <span aria-hidden>{icon}</span>}
          {label}
        </h2>
        <p className="text-muted-foreground text-xs">
          {t("lists.honorees_count", { n: filtered.length })}
        </p>
      </div>

      {seasons.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("common.no_matches")}</p>
      ) : (
        <div className="space-y-5">
          {seasons.map(([season, items]) => (
            <div key={season}>
              <h3 className="text-muted-foreground border-b pb-1 font-mono text-[11px] tracking-wide uppercase">
                {season}
              </h3>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {items.map((e, i) => (
                  <PlayerHoneeRow
                    key={`${e.player.id}-${i}`}
                    player={e.player}
                    teamAbbr={e.team_abbr}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerHoneeRow({
  player,
  teamAbbr,
}: {
  player: AwardHistory[number]["player"];
  teamAbbr: string | null;
}) {
  return (
    <li className="hover:bg-accent -mx-1.5 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors">
      <Link
        href={`/players/${player.slug}`}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <PlayerHeadshot
          externalId={player.external_id}
          url={player.headshot_url}
          name={player.name}
          size={28}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{player.name}</div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            {teamAbbr && (
              <span className="inline-flex items-center gap-1">
                <TeamLogo team={teamAbbr} size={14} />
                <span className="font-mono">{teamAbbr}</span>
              </span>
            )}
            {player.archetype && <ArchetypeBadge archetype={player.archetype} size="sm" />}
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * Team-centric view for the Champions award. The catalog stores every Finals
 * roster member as a separate row, so we dedupe by (season, team) and render
 * one card per championship.
 */
function ChampionsList({
  entries,
  label,
  icon,
  emptyText,
  countText,
}: {
  entries: AwardHistory;
  label: string;
  icon: string | undefined;
  emptyText: string;
  countText: string;
}) {
  const seen = new Map<string, { season: string; team: string }>();
  for (const e of entries) {
    if (!e.season || !e.team_abbr) continue;
    const key = `${e.season}|${e.team_abbr}`;
    if (!seen.has(key)) seen.set(key, { season: e.season, team: e.team_abbr });
  }
  const champions = Array.from(seen.values()).sort((a, b) =>
    b.season.localeCompare(a.season),
  );

  return (
    <section className="space-y-6">
      <div className="border-b pb-2">
        <h2 className="font-heading inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
          {icon && <span aria-hidden>{icon}</span>}
          {label}
        </h2>
        <p className="text-muted-foreground text-xs">{countText}</p>
      </div>

      {champions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {champions.map(({ season, team }) => (
            <Link
              key={`${season}-${team}`}
              href={`/teams/${team}?season=${encodeURIComponent(season)}`}
              className="group flex items-center gap-3 rounded-2xl bg-muted px-3 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <TeamLogo team={team} size={44} />
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">{season}</div>
                <div className="font-heading text-base font-bold tracking-tight">{team}</div>
                <div className="text-muted-foreground text-[11px]">NBA Champions</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
