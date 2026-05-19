"use client";

import { Children, useState, type ReactNode } from "react";
import { useLocale } from "@/components/locale-provider";

interface CollapsibleListProps {
  /** Pre-rendered child nodes (use server-side rendering for the items). */
  children: ReactNode;
  /** How many items to show before the "show more" button kicks in. */
  initial?: number;
  /** Tailwind classes for the inner <ul>. */
  className?: string;
}

/**
 * Show-more wrapper. Accepts pre-rendered children (an array of <li>-able
 * nodes) so it can stay a client component without forcing the caller to
 * pass a render function - RSC cannot serialize functions across the
 * server/client boundary.
 */
export function CollapsibleList({
  children,
  initial = 8,
  className = "space-y-1.5",
}: CollapsibleListProps) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const shown = expanded ? items : items.slice(0, initial);
  const rest = items.length - initial;

  return (
    <div className="space-y-2">
      <ul className={className}>
        {shown.map((child, i) => (
          <li key={i}>{child}</li>
        ))}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground text-xs underline decoration-dotted transition-colors"
        >
          {expanded ? t("common.show_less") : t("common.show_more", { n: rest })}
        </button>
      )}
    </div>
  );
}
