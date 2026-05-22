"use client";

import { TeamLogo } from "@/components/team-logo";
import type { PlayByPlayAction } from "@/lib/api";
import { formatClock } from "@/lib/live-format";

export function PlayByPlayFeed({ actions }: { actions: PlayByPlayAction[] }) {
  if (actions.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">—</p>;
  }
  return (
    <ul className="divide-y">
      {actions.map((a) => (
        <li key={a.action_number} className="flex items-center gap-3 py-2 text-sm">
          <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs">
            {a.period ? `Q${a.period} ` : ""}
            {formatClock(a.clock)}
          </span>
          <span className="flex size-5 shrink-0 items-center justify-center">
            {a.team_tricode && <TeamLogo team={a.team_tricode} size={18} />}
          </span>
          <span className="min-w-0 flex-1">{a.description}</span>
          {(a.score_away || a.score_home) && (
            <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
              {a.score_away}-{a.score_home}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
