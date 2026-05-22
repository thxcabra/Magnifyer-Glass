import { TeamLogo } from "@/components/team-logo";
import type { PlayoffSeries } from "@/lib/api";

function SeriesCard({ s }: { s: PlayoffSeries }) {
  return (
    <div className="bg-card w-44 rounded-md border p-2.5 text-sm">
      {s.teams.map((tm) => {
        const isWinner = s.winner === tm.tricode;
        return (
          <div
            key={tm.tricode}
            className={
              "flex items-center justify-between gap-2 py-0.5 " +
              (s.winner && !isWinner ? "text-muted-foreground" : "")
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <TeamLogo team={tm.tricode} size={18} />
              <span className={isWinner ? "font-bold" : "font-medium"}>
                {tm.tricode}
              </span>
            </span>
            <span
              className={
                "font-mono tabular-nums " + (isWinner ? "font-bold" : "")
              }
            >
              {tm.wins}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Column({
  title,
  items,
  placeholder,
}: {
  title: string;
  items: PlayoffSeries[];
  placeholder?: string;
}) {
  return (
    <div className="flex min-w-44 flex-col">
      <div className="text-muted-foreground mb-3 text-center text-[10px] font-semibold tracking-wide uppercase">
        {title}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {items.length > 0 ? (
          items.map((s, i) => <SeriesCard key={i} s={s} />)
        ) : (
          <div className="bg-card/40 text-muted-foreground flex h-16 w-44 items-center justify-center rounded-md border border-dashed text-xs">
            {placeholder ?? "—"}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlayoffsBracket({
  series,
  labels,
}: {
  series: PlayoffSeries[];
  labels: { r1: string; r2: string; r3: string; finals: string };
}) {
  const pick = (conf: PlayoffSeries["conference"], round: number) =>
    series.filter((s) => s.conference === conf && s.round === round);
  const finals = series.filter((s) => s.round === 4);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-stretch gap-4">
        <Column title={labels.r1} items={pick("West", 1)} />
        <Column title={labels.r2} items={pick("West", 2)} />
        <Column title={labels.r3} items={pick("West", 3)} />
        <Column title={labels.finals} items={finals} placeholder="🏆" />
        <Column title={labels.r3} items={pick("East", 3)} />
        <Column title={labels.r2} items={pick("East", 2)} />
        <Column title={labels.r1} items={pick("East", 1)} />
      </div>
    </div>
  );
}
