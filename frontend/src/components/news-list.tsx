import type { NewsItem } from "@/lib/api";
import { timeAgo } from "@/lib/live-format";

/** Presentational list of news headlines (opens the source in a new tab). */
export function NewsList({
  items,
  locale,
}: {
  items: NewsItem[];
  locale: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y">
      {items.map((n, i) => (
        <li key={`${n.link}-${i}`}>
          <a
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-accent/40 -mx-2 flex flex-col gap-1 rounded-md px-2 py-2.5 transition-colors"
          >
            <span className="text-sm font-medium leading-snug">{n.title}</span>
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {n.source && <span className="font-medium">{n.source}</span>}
              {n.source && n.published && <span aria-hidden>·</span>}
              {n.published && <span>{timeAgo(n.published, locale)}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
