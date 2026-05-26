"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { Input } from "@/components/ui/input";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { useLocale } from "@/components/locale-provider";
import { api } from "@/lib/api";

type Entry = Awaited<ReturnType<typeof api.getAwardHistory>>["entries"][number];

export default function ListAwardPage({
  params,
}: {
  params: Promise<{ award: string }>;
}) {
  const { award } = use(params);
  const { t } = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .getAwardHistory(award)
      .then((d) => setEntries(d.entries))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [award]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return entries;
    return entries.filter((e) =>
      [e.player.name, e.team_abbr ?? "", e.season ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(trimmed),
    );
  }, [entries, query]);

  const bySeason = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of filtered) {
      const s = e.season ?? "-";
      if (!m.has(s)) m.set(s, []);
      m.get(s)!.push(e);
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Try the translated award label, fall back to the raw enum value if no key.
  const labelKey = `award.${award}`;
  const awardLabel = t(labelKey) === labelKey ? award : t(labelKey);

  return (
    <PageShell>
      <PageHeader
        kicker={t("nav.lists")}
        title={awardLabel}
        subtitle={`${entries.length} ${
          entries.length === 1 ? t("common.entry") : t("common.entries")
        } ${t("lists.across_catalog")}`}
      >
        <Link
          href="/lists"
          className="hover:bg-accent rounded-full border border-border px-3 py-1.5 text-sm transition-colors"
        >
          ← {t("lists.all_lists")}
        </Link>
      </PageHeader>

      <SectionCard
        headerRight={
          <div className="w-full max-w-xs sm:w-64">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("lists.filter_placeholder")}
              className="rounded-full"
            />
          </div>
        }
      >
        {loading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t("common.loading")}</p>
        ) : bySeason.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t("common.no_matches")}</p>
        ) : (
          <div className="space-y-6">
            {bySeason.map(([season, items]) => (
              <section key={season}>
                <h3 className="text-muted-foreground mb-3 font-mono text-[11px] tracking-wide uppercase">
                  {season}
                </h3>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {items.map((e) => (
                    <Link key={`${season}-${e.player.id}`} href={`/players/${e.player.slug}`}>
                      <div className="hover:bg-accent flex items-center gap-3 rounded-2xl bg-muted p-3 transition-colors">
                        <PlayerHeadshot
                          externalId={e.player.external_id}
                          url={e.player.headshot_url}
                          name={e.player.name}
                          size={36}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{e.player.name}</div>
                          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                            {e.team_abbr && (
                              <>
                                <TeamLogo team={e.team_abbr} size={14} /> {e.team_abbr}
                              </>
                            )}
                            {e.player.archetype && (
                              <ArchetypeBadge archetype={e.player.archetype} size="sm" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}
