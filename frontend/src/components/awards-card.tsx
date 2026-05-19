"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import type { AwardType, PlayerAward } from "@/lib/api";

interface CategoryDef {
  /** Translation key resolved at render - falls back to English `label`. */
  i18n: string;
  label: string;
  awards: AwardType[];
  icon: string;
}

const CATEGORIES: CategoryDef[] = [
  { i18n: "awards.cat.hof", label: "Hall of Fame", awards: ["hof_inductee"], icon: "🏛️" },
  { i18n: "awards.cat.champ", label: "Championships", awards: ["champion"], icon: "🏆" },
  { i18n: "award.mvp", label: "MVP", awards: ["mvp"], icon: "👑" },
  { i18n: "award.finals_mvp", label: "Finals MVP", awards: ["finals_mvp"], icon: "🏅" },
  { i18n: "awards.cat.dpoy", label: "DPOY", awards: ["dpoy"], icon: "🛡️" },
  { i18n: "award.all_star", label: "All-Star", awards: ["all_star"], icon: "⭐" },
  { i18n: "award.all_star_mvp", label: "All-Star Game MVP", awards: ["all_star_mvp"], icon: "✨" },
  { i18n: "awards.cat.all_nba_1", label: "All-NBA 1st", awards: ["all_nba_first"], icon: "" },
  { i18n: "awards.cat.all_nba_2", label: "All-NBA 2nd", awards: ["all_nba_second"], icon: "" },
  { i18n: "awards.cat.all_nba_3", label: "All-NBA 3rd", awards: ["all_nba_third"], icon: "" },
  { i18n: "awards.cat.all_def_1", label: "All-Defensive 1st", awards: ["all_defensive_first"], icon: "" },
  { i18n: "awards.cat.all_def_2", label: "All-Defensive 2nd", awards: ["all_defensive_second"], icon: "" },
  { i18n: "award.roy", label: "Rookie of the Year", awards: ["roy"], icon: "🌱" },
  { i18n: "awards.cat.sixth_man", label: "Sixth Man", awards: ["sixth_man"], icon: "" },
  { i18n: "awards.cat.most_improved", label: "Most Improved", awards: ["most_improved"], icon: "" },
  { i18n: "awards.cat.clutch", label: "Clutch Player", awards: ["clutch_player"], icon: "" },
  { i18n: "awards.cat.all_rookie_1", label: "All-Rookie 1st", awards: ["all_rookie_first"], icon: "" },
  { i18n: "awards.cat.all_rookie_2", label: "All-Rookie 2nd", awards: ["all_rookie_second"], icon: "" },
];

const STAT_TITLES: { i18n: string; label: string; award: AwardType }[] = [
  { i18n: "award.scoring_title", label: "Scoring title", award: "scoring_title" },
  { i18n: "award.assists_title", label: "Assists title", award: "assists_title" },
  { i18n: "award.rebounding_title", label: "Rebounding title", award: "rebounding_title" },
  { i18n: "award.steals_title", label: "Steals title", award: "steals_title" },
  { i18n: "award.blocks_title", label: "Blocks title", award: "blocks_title" },
];

function clean(season: string | null): string | null {
  if (!season || season === "_lifetime_") return null;
  return season;
}

function Seasons({ items }: { items: PlayerAward[] }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const seasons = items
    .map((i) => clean(i.season))
    .filter((s): s is string => Boolean(s))
    .sort((a, b) => b.localeCompare(a));
  if (seasons.length === 0) return null;

  const limit = 6;
  const show = expanded ? seasons : seasons.slice(0, limit);
  const rest = seasons.length - limit;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-[11px]">
      {show.map((s) => (
        <span key={s} className="bg-muted/60 rounded px-1.5 py-0.5 font-mono">
          {s}
        </span>
      ))}
      {!expanded && rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="hover:text-foreground rounded px-1.5 py-0.5 text-[11px] underline decoration-dotted"
        >
          {t("awards.plus_more", { n: rest })}
        </button>
      )}
    </div>
  );
}

function AwardRow({
  icon,
  label,
  items,
  inductedLabel,
}: {
  icon: string;
  label: string;
  items: PlayerAward[];
  inductedLabel: string;
}) {
  if (items.length === 0) return null;
  const isLifetime = items.every((i) => !clean(i.season));
  return (
    <li className="space-y-1.5 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="inline-flex items-baseline gap-2">
          {icon && <span aria-hidden>{icon}</span>}
          <span className="font-medium">{label}</span>
        </span>
        {isLifetime ? (
          <Badge variant="secondary" className="text-[10px]">
            {inductedLabel}
          </Badge>
        ) : (
          <span className="text-muted-foreground font-mono text-xs">
            {items.length}×
          </span>
        )}
      </div>
      {!isLifetime && <Seasons items={items} />}
    </li>
  );
}

const PRIMARY_LIMIT = 4;

export function AwardsCard({ awards }: { awards: PlayerAward[] }) {
  const [showAll, setShowAll] = useState(false);
  const { t } = useLocale();
  if (!awards || awards.length === 0) return null;

  const byAward = new Map<AwardType, PlayerAward[]>();
  for (const a of awards) {
    const arr = byAward.get(a.award) ?? [];
    arr.push(a);
    byAward.set(a.award, arr);
  }

  // Resolve a category's display label with English fallback. Some keys point
  // to award.* (single-award keys); others to awards.cat.* (composite category
  // labels). Both fall through to the literal English label if missing.
  const labelOf = (i18nKey: string, fallback: string) => {
    const resolved = t(i18nKey);
    return resolved === i18nKey ? fallback : resolved;
  };
  const inducted = t("awards.inducted");

  const rows = CATEGORIES.flatMap((cat) => {
    const items = cat.awards.flatMap((a) => byAward.get(a) ?? []);
    if (items.length === 0) return [];
    return [
      {
        node: (
          <AwardRow
            key={cat.label}
            icon={cat.icon}
            label={labelOf(cat.i18n, cat.label)}
            items={items}
            inductedLabel={inducted}
          />
        ),
      },
    ];
  });

  const titleRows = STAT_TITLES.flatMap((st) => {
    const items = byAward.get(st.award) ?? [];
    if (items.length === 0) return [];
    return [
      {
        node: (
          <AwardRow
            key={st.award}
            icon=""
            label={labelOf(st.i18n, st.label)}
            items={items}
            inductedLabel={inducted}
          />
        ),
      },
    ];
  });

  if (rows.length === 0 && titleRows.length === 0) return null;

  const primaryRows = showAll ? rows : rows.slice(0, PRIMARY_LIMIT);
  const hiddenCount =
    (rows.length - primaryRows.length) + (showAll ? 0 : titleRows.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{t("player.awards_honors")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">{primaryRows.map((r) => r.node)}</ul>
        {showAll && titleRows.length > 0 && (
          <>
            <div className="text-muted-foreground mt-4 mb-1 text-xs tracking-wide uppercase">
              {t("awards.statistical_titles")}
            </div>
            <ul className="divide-y">{titleRows.map((r) => r.node)}</ul>
          </>
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-muted-foreground hover:text-foreground mt-3 text-xs underline decoration-dotted transition-colors"
          >
            {showAll ? t("awards.show_top") : t("awards.show_more", { n: hiddenCount })}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
