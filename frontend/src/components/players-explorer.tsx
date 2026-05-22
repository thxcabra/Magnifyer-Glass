"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { ARCHETYPE_META } from "@/lib/stat-meta";
import { useLocale } from "@/components/locale-provider";
import type { Player } from "@/lib/api";

type Filter = "all" | "classified" | "unclassified";

export function PlayersExplorer({
  players,
  initialArchetype = null,
}: {
  players: Player[];
  initialArchetype?: string | null;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("classified");
  const [archetype, setArchetype] = useState<string | null>(initialArchetype);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return players.filter((p) => {
      if (archetype && p.archetype !== archetype) return false;
      if (filter === "classified" && !p.archetype) return false;
      if (filter === "unclassified" && p.archetype) return false;
      if (!trimmed) return true;
      return [
        p.name,
        p.current_team ?? "",
        p.position ?? "",
        p.archetype ? ARCHETYPE_META[p.archetype].label : "",
        p.college ?? "",
        p.country ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(trimmed);
    });
  }, [players, query, filter, archetype]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("nav.players")}</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">{t("players.title")}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("players.sub")}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("players.search_placeholder")}
          className="max-w-sm"
        />
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="classified" className="text-xs">
              {t("players.tab_classified")}
            </TabsTrigger>
            <TabsTrigger value="unclassified" className="text-xs">
              {t("players.tab_unclassified")}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              {t("players.tab_all")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-muted-foreground ml-auto text-xs">
          {t("players.count_shown", { shown: filtered.length, total: players.length })}
        </span>
      </div>

      {archetype && ARCHETYPE_META[archetype as keyof typeof ARCHETYPE_META] && (
        <button
          type="button"
          onClick={() => setArchetype(null)}
          className="bg-primary/15 text-primary hover:bg-primary/25 mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
        >
          {ARCHETYPE_META[archetype as keyof typeof ARCHETYPE_META].label}
          <span aria-hidden>✕</span>
        </button>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-sm">{t("common.no_matches")}</p>
      ) : (
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <div className="hover:bg-accent/40 flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors">
                <PlayerHeadshot
                  externalId={p.external_id}
                  url={p.headshot_url}
                  name={p.name}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate font-medium">{p.name}</div>
                    {p.jersey_number && (
                      <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                        #{p.jersey_number}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                    {p.position && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {p.position}
                      </Badge>
                    )}
                    {p.current_team && (
                      <span className="inline-flex items-center gap-1">
                        <TeamLogo team={p.current_team} size={14} />
                        {p.current_team}
                      </span>
                    )}
                  </div>
                  {p.archetype && (
                    <div className="mt-1.5">
                      <ArchetypeBadge
                        archetype={p.archetype}
                        confidence={p.archetype_confidence}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
