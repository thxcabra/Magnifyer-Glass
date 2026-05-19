"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TeamLogo } from "@/components/team-logo";
import { useLocale } from "@/components/locale-provider";
import type { Team } from "@/lib/api";

function byName(a: Team, b: Team) {
  return a.full_name.localeCompare(b.full_name);
}

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

export function TeamsExplorer({ teams }: { teams: Team[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const { east, west, other } = useMemo(() => {
    const filtered = teams.filter((tm) => teamMatches(tm, query));
    return {
      east: filtered.filter((tm) => tm.conference === "East").sort(byName),
      west: filtered.filter((tm) => tm.conference === "West").sort(byName),
      other: filtered.filter((tm) => !tm.conference).sort(byName),
    };
  }, [teams, query]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("nav.teams")}</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">{t("teams.title")}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("teams.sub")}</p>

      <div className="mt-6 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("teams.placeholder")}
        />
      </div>

      {/* Geographic order: West on the left, East on the right, mirroring
          a USA map. Users asked for this swap so the columns feel intuitive. */}
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <ConferenceColumn label={t("years.western_conference")} teams={west} />
        <ConferenceColumn label={t("years.eastern_conference")} teams={east} />
      </div>

      {other.length > 0 && (
        <div className="mt-10">
          <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("teams.other")}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {other.map((tm) => (
              <TeamCard key={tm.id} t={tm} />
            ))}
          </div>
        </div>
      )}

      {east.length === 0 && west.length === 0 && other.length === 0 && (
        <p className="text-muted-foreground mt-10 text-sm">{t("common.no_matches")}</p>
      )}
    </div>
  );
}

function ConferenceColumn({ label, teams }: { label: string; teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <section>
        <h2 className="border-b pb-2 text-lg font-semibold tracking-tight">{label}</h2>
      </section>
    );
  }
  const byDivision = new Map<string, Team[]>();
  for (const t of teams) {
    const d = t.division ?? "Unassigned";
    if (!byDivision.has(d)) byDivision.set(d, []);
    byDivision.get(d)!.push(t);
  }
  return (
    <section>
      <h2 className="border-b pb-2 text-lg font-semibold tracking-tight">{label}</h2>
      <div className="mt-4 space-y-6">
        {Array.from(byDivision.entries()).map(([div, group]) => (
          <div key={div}>
            <h3 className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
              {div}
            </h3>
            <div className="space-y-2">
              {group.map((t) => (
                <TeamCard key={t.id} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamCard({ t }: { t: Team }) {
  return (
    <Link href={`/teams/${t.abbreviation}`} className="block">
      <Card className="hover:bg-accent/40 transition-colors">
        <CardContent className="flex items-center gap-3 py-3">
          <TeamLogo team={t.abbreviation} size={36} />
          <div className="min-w-0">
            <div className="font-medium">{t.full_name}</div>
            <div className="text-muted-foreground text-xs">
              {t.city}
              {t.year_founded ? ` · est. ${t.year_founded}` : ""}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
