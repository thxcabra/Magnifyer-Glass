import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { StatLegend } from "@/components/stat-legend";
import { api } from "@/lib/api";
import { getServerT } from "@/lib/locale-server";

export const revalidate = 60;

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t } = await getServerT();

  let comparison;
  try {
    comparison = await api.getComparison(slug, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }

  const { prospect, matches, weights } = comparison;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start gap-5">
        <PlayerHeadshot
          externalId={prospect.external_id}
          url={prospect.headshot_url}
          name={prospect.name}
          size={88}
        />
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("compare.kicker")}
          </p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">{prospect.name}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("compare.intro")}{" "}
            <StatLegend
              metric="confidence"
              label={t("compare.weight_stats", { pct: Math.round(weights.stats * 100) })}
            /> ·{" "}
            <span className="font-mono">
              {t("compare.weight_phys", { pct: Math.round(weights.phys * 100) })}
            </span>
          </p>
        </div>
      </div>

      {matches.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {t("compare.no_matches", { name: prospect.name })}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("compare.no_matches_hint_prefix")}{" "}
              <span className="font-mono">python -m app.jobs.precompute_similarity</span>{" "}
              {t("compare.no_matches_hint_suffix")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {matches.map((m, i) => (
            <Link key={m.player.id} href={`/players/${m.player.slug}`} className="block">
              <Card className="hover:bg-accent/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-muted-foreground w-8 text-right font-mono text-sm">
                        #{i + 1}
                      </div>
                      <PlayerHeadshot
                        externalId={m.player.external_id}
                        name={m.player.name}
                        size={56}
                      />
                      <div>
                        <CardTitle className="text-lg font-medium">
                          {m.player.name}
                          {m.player.jersey_number && (
                            <span className="text-muted-foreground ml-2 font-mono text-xs">
                              #{m.player.jersey_number}
                            </span>
                          )}
                        </CardTitle>
                        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                          {m.player.position && (
                            <Badge variant="secondary" className="text-xs">
                              {m.player.position}
                            </Badge>
                          )}
                          {m.player.current_team && (
                            <span className="inline-flex items-center gap-1">
                              <TeamLogo team={m.player.current_team} size={16} />
                              {m.player.current_team}
                            </span>
                          )}
                          {m.player.archetype && (
                            <ArchetypeBadge archetype={m.player.archetype} size="sm" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl font-semibold tabular-nums">
                        {(m.similarity * 100).toFixed(1)}
                      </div>
                      <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
                        {t("compare.similarity")}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground pb-4 font-mono text-xs">
                  {t("compare.stats_short")} {(m.stats_component ? m.stats_component * 100 : 0).toFixed(1)} · {t("compare.phys_short")}{" "}
                  {(m.phys_component ? m.phys_component * 100 : 0).toFixed(1)}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
