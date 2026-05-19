interface PercentileBarProps {
  label: React.ReactNode;
  value: number | null | undefined;
  percentile: number | null | undefined;
  format?: (v: number) => string;
}

function colorForPercentile(p: number): string {
  if (p >= 85) return "bg-emerald-500";
  if (p >= 70) return "bg-lime-500";
  if (p >= 50) return "bg-amber-400";
  if (p >= 30) return "bg-orange-500";
  return "bg-rose-500";
}

export function PercentileBar({ label, value, percentile, format }: PercentileBarProps) {
  const p = percentile ?? null;
  const v = value ?? null;
  const displayValue =
    v === null ? "-" : format ? format(v) : v.toFixed(2);

  return (
    <div className="grid grid-cols-[120px_1fr_48px] items-center gap-3 py-1.5">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="bg-muted relative h-2 overflow-hidden rounded-full">
        {p !== null && (
          <div
            className={`absolute inset-y-0 left-0 ${colorForPercentile(p)}`}
            style={{ width: `${Math.max(2, Math.min(100, p))}%` }}
          />
        )}
      </div>
      <div className="text-right font-mono text-xs tabular-nums">{displayValue}</div>
    </div>
  );
}
