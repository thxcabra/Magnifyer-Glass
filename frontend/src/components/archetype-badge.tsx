"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ARCHETYPE_META } from "@/lib/stat-meta";
import { useLocale } from "@/components/locale-provider";
import type { Archetype } from "@/lib/api";

interface ArchetypeBadgeProps {
  archetype: Archetype;
  confidence?: number | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<ArchetypeBadgeProps["size"]>, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-3.5 py-1.5",
};

/** Confidence → colored chip. Mirrors BBall-Index's role-badge color scale. */
function confidenceTier(c: number | null | undefined): string {
  if (c === null || c === undefined)
    return "border-input bg-card text-foreground";
  if (c >= 0.7)
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (c >= 0.5) return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  if (c >= 0.3) return "border-orange-500/40 bg-orange-500/15 text-orange-300";
  return "border-rose-500/40 bg-rose-500/15 text-rose-300";
}

export function ArchetypeBadge({ archetype, confidence, size = "md" }: ArchetypeBadgeProps) {
  const { t } = useLocale();
  const meta = ARCHETYPE_META[archetype];

  // Translation keys fall back to ARCHETYPE_META when missing - keeps mixed
  // English/translated states safe if a new archetype is added without a key.
  const labelKey = `archetype.${archetype}.label`;
  const descKey = `archetype.${archetype}.description`;
  const label = t(labelKey) === labelKey ? meta.label : t(labelKey);
  const description = t(descKey) === descKey ? meta.description : t(descKey);

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={
            "group inline-flex cursor-help items-baseline gap-2 rounded-full border font-medium tracking-tight transition-colors " +
            sizeClasses[size] +
            " " +
            confidenceTier(confidence)
          }
        >
          <span>{label}</span>
          {confidence !== undefined && confidence !== null && (
            <span className="font-mono text-[10px] opacity-80">
              {(confidence * 100).toFixed(0)}%
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="bottom" align="start">
        <div className="space-y-3">
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("archetype.tooltip_label")}
            </div>
            <div className="text-lg font-semibold">{label}</div>
          </div>
          <p className="text-sm leading-relaxed">{description}</p>
          <div>
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              {t("archetype.tooltip_examples")}
            </div>
            {/* Exemplars are player names - left untranslated. */}
            <div className="text-sm">{meta.exemplars}</div>
          </div>
          {confidence !== undefined && confidence !== null && (
            <div className="text-muted-foreground border-t pt-2 text-xs">
              <span className="font-medium">
                {t("archetype.tooltip_confidence_label", {
                  pct: (confidence * 100).toFixed(0),
                })}
              </span>
              {" "}{t("archetype.tooltip_confidence_explainer")}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
