"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayerHeadshot } from "@/components/player-headshot";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { ARCHETYPE_META } from "@/lib/stat-meta";
import { useLocale } from "@/components/locale-provider";
import type { Archetype, Player } from "@/lib/api";

type Hit = Player;

interface DiscoveryExplorerProps {
  players: Hit[];
  activeArchetype: Archetype | null;
  activeDraftClass: number | null;
  activePosition: string | null;
}

export function DiscoveryExplorer({
  players,
  activeArchetype,
  activeDraftClass,
  activePosition,
}: DiscoveryExplorerProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return players;
    return players.filter((p) =>
      [
        p.name,
        p.current_team ?? "",
        p.position ?? "",
        p.archetype ?? "",
        p.college ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(trimmed),
    );
  }, [players, query]);

  const link = (overrides: Record<string, string | undefined>) => {
    const next: Record<string, string> = {};
    if (activeDraftClass) next.draft_class = String(activeDraftClass);
    if (activePosition) next.position = activePosition;
    if (activeArchetype) next.archetype = activeArchetype;
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    const qs = new URLSearchParams(next).toString();
    return `/discovery${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {t("nav.prospects")}
      </p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">
        {/* Archetype labels are translated via the dedicated archetype.<key>.label
            entries; the explorer falls back to the English ARCHETYPE_META label
            for the bare title if no translation exists yet. */}
        {activeArchetype
          ? t(`archetype.${activeArchetype}.label`) === `archetype.${activeArchetype}.label`
            ? ARCHETYPE_META[activeArchetype].label
            : t(`archetype.${activeArchetype}.label`)
          : t("discovery.title")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {activeArchetype
          ? t(`archetype.${activeArchetype}.description`) === `archetype.${activeArchetype}.description`
            ? ARCHETYPE_META[activeArchetype].description
            : t(`archetype.${activeArchetype}.description`)
          : t("discovery.sub")}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("discovery.placeholder")}
          className="max-w-sm"
        />
        {activeArchetype && (
          <Link
            href={link({ archetype: undefined })}
            className="text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-xs transition-colors"
          >
            {t("discovery.clear_archetype")}
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">{t("common.no_matches")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <Card className="hover:bg-accent/40 transition-colors">
                <CardContent className="flex items-start gap-3 py-4">
                  <PlayerHeadshot
                    externalId={p.external_id}
                    url={p.headshot_url}
                    name={p.name}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                          {p.position && (
                            <Badge variant="secondary" className="text-xs">
                              {p.position}
                            </Badge>
                          )}
                          {p.current_team && (
                            <span className="text-muted-foreground">{p.current_team}</span>
                          )}
                          {!p.is_nba && p.college && (
                            <span className="truncate">{p.college}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {p.archetype && (
                      <div className="mt-2">
                        <ArchetypeBadge
                          archetype={p.archetype}
                          confidence={p.archetype_confidence}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
