import { StatLegend } from "@/components/stat-legend";

interface StatTileProps {
  /** Display label */
  label: string;
  /** Stat-meta key for the hover legend (defaults to no legend) */
  legend?: string;
  value: number | null | undefined;
  format?: (v: number) => string;
  /** Render this tile with the primary accent - used for headline stats */
  accent?: boolean;
}

export function StatTile({ label, legend, value, format, accent = false }: StatTileProps) {
  const display =
    value === null || value === undefined
      ? "-"
      : format
        ? format(value)
        : value.toFixed(1);

  return (
    <div
      className={
        "border bg-card rounded-xl px-4 py-3 " +
        (accent ? "border-primary/30 bg-primary/5" : "")
      }
    >
      <div
        className={
          "font-mono text-3xl font-semibold tracking-tight tabular-nums " +
          (accent ? "text-primary" : "")
        }
      >
        {display}
      </div>
      <div className="text-muted-foreground mt-1 text-[10px] tracking-wider uppercase">
        {legend ? <StatLegend metric={legend} label={label} /> : label}
      </div>
    </div>
  );
}
