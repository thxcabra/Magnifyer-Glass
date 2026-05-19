import { ArchetypeBadge } from "@/components/archetype-badge";
import type { Archetype } from "@/lib/api";

interface FitEntry {
  archetype: Archetype;
  score: number;
}

interface ArchetypeFitsProps {
  /** Top-N partial archetype fits (sorted high → low) */
  fits: FitEntry[];
  /** The primary archetype (if any) - hidden from the alternates list */
  primary: Archetype | null;
  /** Heading shown above the list */
  heading: string;
}

export function ArchetypeFits({ fits, primary, heading }: ArchetypeFitsProps) {
  const alternates = fits.filter((f) => f.archetype !== primary).slice(0, 3);
  if (alternates.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground text-xs tracking-wide uppercase">
        {heading}
      </div>
      <ul className="space-y-1.5">
        {alternates.map((f) => (
          <li key={f.archetype} className="flex items-center justify-between gap-3">
            <ArchetypeBadge archetype={f.archetype} size="sm" />
            <span className="text-muted-foreground font-mono text-xs">
              {(f.score * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
