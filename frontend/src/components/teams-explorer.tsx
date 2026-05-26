"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { TeamLogo } from "@/components/team-logo";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { useLocale } from "@/components/locale-provider";
import type { Team } from "@/lib/api";

function teamMatches(t: Team, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    t.full_name.toLowerCase().includes(needle) ||
    t.abbreviation.toLowerCase().includes(needle) ||
    (t.city ?? "").toLowerCase().includes(needle) ||
    (t.nickname ?? "").toLowerCase().includes(needle)
  );
}

// West first, then East, alphabetical within — keeps the grid tidy while each
// card still carries its own conference label.
const CONF_ORDER: Record<string, number> = { West: 0, East: 1 };
function byConferenceThenName(a: Team, b: Team) {
  const ca = CONF_ORDER[a.conference ?? ""] ?? 2;
  const cb = CONF_ORDER[b.conference ?? ""] ?? 2;
  if (ca !== cb) return ca - cb;
  return a.full_name.localeCompare(b.full_name);
}

export function TeamsExplorer({ teams }: { teams: Team[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => teams.filter((tm) => teamMatches(tm, query)).sort(byConferenceThenName),
    [teams, query],
  );

  return (
    <PageShell>
      <PageHeader kicker={t("nav.teams")} title={t("teams.title")} subtitle={t("teams.sub")} />

      <SectionCard
        title={t("teams.all")}
        headerRight={
          <div className="w-full max-w-xs sm:w-64">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("teams.placeholder")}
              className="rounded-full"
            />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t("common.no_matches")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((tm) => (
              <TeamSubCard key={tm.id} team={tm} confLabel={confLabel(tm, t)} />
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}

function confLabel(team: Team, t: (k: string) => string): string | null {
  if (team.conference === "West") return t("teams.west");
  if (team.conference === "East") return t("teams.east");
  return null;
}

function TeamSubCard({ team, confLabel }: { team: Team; confLabel: string | null }) {
  return (
    <Link
      href={`/teams/${team.abbreviation}`}
      className="bg-muted hover:bg-accent hover:text-accent-foreground flex items-center gap-3.5 rounded-2xl p-3.5 transition-colors"
    >
      <TeamLogo team={team.abbreviation} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{team.full_name}</div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          <span className="font-mono">{team.abbreviation}</span>
          {confLabel && (
            <>
              <span aria-hidden>·</span>
              <span>{confLabel}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
