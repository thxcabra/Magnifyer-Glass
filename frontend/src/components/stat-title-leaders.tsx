"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { useLocale } from "@/components/locale-provider";
import { api } from "@/lib/api";

// Per-category metadata: which award enum produced the row, which leaders
// bucket to read, the unit symbol after the value, and how to format it.
type Category = {
  award: string;
  /** Key into the /years/{season}/leaders response. */
  bucket: "points" | "assists" | "rebounds" | "steals" | "blocks";
  /** Per-game suffix shown after the leader value. */
  suffix: string;
};

const CATEGORIES: Record<string, Category> = {
  scoring_title: { award: "scoring_title", bucket: "points", suffix: "PPG" },
  assists_title: { award: "assists_title", bucket: "assists", suffix: "APG" },
  rebounding_title: { award: "rebounding_title", bucket: "rebounds", suffix: "RPG" },
  steals_title: { award: "steals_title", bucket: "steals", suffix: "SPG" },
  blocks_title: { award: "blocks_title", bucket: "blocks", suffix: "BPG" },
};

const STAT_ICONS: Record<string, string> = {
  scoring_title: "🎯",
  assists_title: "🎁",
  rebounding_title: "🪣",
  steals_title: "🥊",
  blocks_title: "🛡️",
};

export interface StatTitleCard {
  award: string;
  label: string;
  team_abbr: string | null;
  winner: {
    id: string;
    name: string;
    slug: string;
    external_id: string | null;
    headshot_url: string | null;
  };
}

interface Props {
  season: string;
  titles: StatTitleCard[];
}

type LeadersPayload = Awaited<ReturnType<typeof api.getSeasonLeaders>>;

/**
 * Stat-title cards on /years that expand into a top-10 leaderboard for the
 * selected category. The first click triggers a single fetch for ALL five
 * categories (so subsequent clicks are instant), and the panel itself is a
 * simple disclosure - clicking the same card again collapses it.
 */
export function StatTitleLeaders({ season, titles }: Props) {
  const { t } = useLocale();
  const [openAward, setOpenAward] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<LeadersPayload["leaders"] | null>(null);
  const [loading, setLoading] = useState(false);

  // Lazy-load once the user clicks any card. We refetch only if the season
  // changes - the leaders payload is stable for a finalized season.
  useEffect(() => {
    if (!openAward || leaders) return;
    setLoading(true);
    api
      .getSeasonLeaders(season)
      .then((r) => setLeaders(r.leaders))
      .catch((err) => {
        console.error(err);
        setLeaders(null);
      })
      .finally(() => setLoading(false));
  }, [openAward, leaders, season]);

  if (titles.length === 0) return null;
  const activeCategory = openAward ? CATEGORIES[openAward] : null;
  const activeRows = activeCategory && leaders ? leaders[activeCategory.bucket] : [];

  return (
    <section className="mt-8">
      <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
        {t("years.statistical_titles")}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {titles.map((s) => {
          const cat = CATEGORIES[s.award];
          if (!cat) return null;
          const isOpen = openAward === s.award;
          return (
            <button
              key={s.award}
              type="button"
              onClick={() => setOpenAward(isOpen ? null : s.award)}
              aria-expanded={isOpen}
              className="text-left"
            >
              <Card
                className={
                  "h-full transition-colors " +
                  (isOpen ? "border-primary/40 bg-primary/5" : "hover:bg-accent/40")
                }
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <span className="text-xl" aria-hidden>
                    {STAT_ICONS[s.award] ?? "•"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-muted-foreground text-[10px] tracking-wider uppercase">
                      {s.label}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {s.winner.name}
                    </div>
                    {s.team_abbr && (
                      <div className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-[11px]">
                        <TeamLogo team={s.team_abbr} size={12} /> {s.team_abbr}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Expanded leaderboard panel - rendered as a sibling so it spans the
          full row width on every viewport without disturbing the card grid. */}
      {openAward && activeCategory && (
        <div className="mt-3 rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 text-sm font-medium">
              <span aria-hidden>{STAT_ICONS[openAward]}</span>
              {t(`award.${openAward}`)}
              <span className="text-muted-foreground font-mono text-[11px]">
                {season}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setOpenAward(null)}
              className="text-muted-foreground hover:text-foreground text-xs underline decoration-dotted"
            >
              {t("common.show_less")}
            </button>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : !activeRows || activeRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("common.no_data")}</p>
          ) : (
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {activeRows.map((e) => (
                <li
                  key={`${openAward}-${e.player.id}`}
                  className="hover:bg-accent/40 -mx-1.5 flex items-center gap-2.5 rounded px-1.5 py-1 transition-colors"
                >
                  <span className="text-muted-foreground w-5 text-right font-mono text-[11px]">
                    {e.rank}.
                  </span>
                  <Link
                    href={`/players/${e.player.slug}`}
                    className="flex min-w-0 flex-1 items-center gap-2.5"
                  >
                    <PlayerHeadshot
                      externalId={e.player.external_id}
                      url={e.player.headshot_url}
                      name={e.player.name}
                      size={24}
                    />
                    <span className="truncate text-sm font-medium">
                      {e.player.name}
                    </span>
                    {e.team_abbr && (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                        <TeamLogo team={e.team_abbr} size={12} /> {e.team_abbr}
                      </span>
                    )}
                  </Link>
                  <span className="font-mono text-sm tabular-nums">
                    {e.value.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                    {activeCategory.suffix}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
