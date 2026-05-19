"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STAT_META } from "@/lib/stat-meta";
import { useLocale } from "@/components/locale-provider";

interface StatLegendProps {
  /** Key into STAT_META, e.g. "usg_pct" */
  metric: string;
  /** Optional override of the visible label */
  label?: string;
  /** Render style: dotted underline (default) or info icon */
  variant?: "underline" | "icon";
}

export function StatLegend({ metric, label, variant = "underline" }: StatLegendProps) {
  const { t } = useLocale();
  const meta = STAT_META[metric];
  if (!meta) return <span>{label ?? metric}</span>;

  // Translation falls back to the English STAT_META copy whenever a key is
  // missing - keeps the tooltip readable while pt-BR is being completed.
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const tooltipLabel = tr(`stat.${metric}.label`, meta.label);
  const tooltipDefinition = tr(`stat.${metric}.definition`, meta.definition);
  const tooltipWhy = tr(`stat.${metric}.why`, meta.why);
  const whyLabel = tr("stat.why_it_matters", "Why it matters:");

  const displayLabel = label ?? meta.short;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={
            variant === "underline"
              ? "cursor-help underline decoration-dotted underline-offset-2"
              : "inline-flex cursor-help items-center gap-1"
          }
        >
          {displayLabel}
          {variant === "icon" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3 opacity-60"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1.5">
          <div className="font-semibold">{tooltipLabel}</div>
          <div className="text-xs leading-relaxed">{tooltipDefinition}</div>
          <div className="text-muted-foreground text-xs leading-relaxed">
            <span className="font-medium">{whyLabel}</span> {tooltipWhy}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
