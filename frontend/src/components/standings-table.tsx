import Link from "next/link";
import { TeamLogo } from "@/components/team-logo";
import type { StandingRow } from "@/lib/api";

export function StandingsTable({
  title,
  rows,
}: {
  title: string;
  rows: StandingRow[];
}) {
  return (
    <div>
      <h2 className="border-primary mb-3 border-l-4 pl-3 text-lg font-bold tracking-tight">
        {title}
      </h2>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-[10px] tracking-wide uppercase">
              <th className="w-8 py-2 pr-2 pl-3">#</th>
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 pr-2 text-right">W</th>
              <th className="py-2 pr-2 text-right">L</th>
              <th className="py-2 pr-3 text-right">PCT</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {rows.map((r) => {
              const seedLine = r.rank === 8 || r.rank === 10;
              return (
                <tr
                  key={r.tricode}
                  className={
                    "border-b last:border-0 " +
                    (seedLine ? "border-b-primary/40" : "")
                  }
                >
                  <td className="text-muted-foreground py-2 pr-2 pl-3">{r.rank}</td>
                  <td className="py-2 pr-2 font-sans">
                    <Link
                      href={`/teams/${r.tricode}`}
                      className="inline-flex items-center gap-2 hover:underline"
                    >
                      <TeamLogo team={r.tricode} size={20} />
                      <span className="font-medium">{r.tricode}</span>
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-right">{r.wins}</td>
                  <td className="py-2 pr-2 text-right">{r.losses}</td>
                  <td className="py-2 pr-3 text-right">
                    {r.win_pct.toFixed(3).replace(/^0/, "")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
