"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import type { Player } from "@/lib/api";

type DraftPick = Pick<
  Player,
  | "id"
  | "external_id"
  | "name"
  | "slug"
  | "position"
  | "draft_class"
  | "draft_round"
  | "draft_number"
  | "current_team"
  | "is_nba"
  | "source"
  | "headshot_url"
  | "archetype"
  | "archetype_confidence"
> & {
  /** Team that drafted the player (rookie-season team). Falls back to
   *  current_team only when the rookie season isn't in our dataset. */
  draft_team?: string | null;
};

export function DraftClassGrid({ picks }: { picks: DraftPick[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return picks;
    return picks.filter((p) =>
      [p.name, p.current_team ?? "", p.position ?? "", p.archetype ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(trimmed),
    );
  }, [picks, query]);

  const byRound = useMemo(() => {
    const m = new Map<number, DraftPick[]>();
    for (const p of filtered) {
      const r = p.draft_round ?? 0;
      if (!m.has(r)) m.set(r, []);
      m.get(r)!.push(p);
    }
    return m;
  }, [filtered]);

  return (
    <>
      <div className="mt-6 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, team, position..."
        />
      </div>

      <div className="mt-10 space-y-10">
        {Array.from(byRound.keys())
          .sort((a, b) => a - b)
          .map((round) => (
            <section key={round}>
              <h2 className="text-muted-foreground border-b pb-2 text-sm tracking-wide uppercase">
                {round === 0 ? "Unknown round" : `Round ${round}`}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byRound.get(round)!.map((p) => (
                  <Link key={p.id} href={`/players/${p.slug}`}>
                    <Card className="hover:bg-accent/40 transition-colors">
                      <CardContent className="flex items-center gap-3 py-3">
                        <div className="text-muted-foreground w-10 shrink-0 text-right font-mono text-sm">
                          {p.draft_number ? `#${p.draft_number}` : "-"}
                        </div>
                        <PlayerHeadshot
                          externalId={p.external_id}
                          url={p.headshot_url}
                          name={p.name}
                          size={40}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                            {p.position && (
                              <Badge variant="secondary" className="text-xs">
                                {p.position}
                              </Badge>
                            )}
                            {/* Draft team is the franchise that actually picked
                                the player (their rookie-season squad). We surface
                                that here; current_team only shows up when no
                                rookie-season data is available, since the user
                                cares more about who drafted them than where
                                they ended up. */}
                            {(p.draft_team ?? p.current_team) && (
                              <span className="inline-flex items-center gap-1">
                                <TeamLogo
                                  team={(p.draft_team ?? p.current_team) as string}
                                  size={14}
                                />
                                {(p.draft_team ?? p.current_team) as string}
                              </span>
                            )}
                            {p.archetype && <ArchetypeBadge archetype={p.archetype} size="sm" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}

        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm">No picks match that filter.</p>
        )}
      </div>
    </>
  );
}
