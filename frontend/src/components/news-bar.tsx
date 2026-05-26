"use client";

import { useLocale } from "@/components/locale-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLive } from "@/lib/swr";
import { timeAgo } from "@/lib/live-format";
import type { NewsItem } from "@/lib/api";
import type { Theme } from "@/lib/theme";

/**
 * Persistent right rail (lg+). The brand's single always-orange surface, with
 * the light/dark toggle in its header and league news as light cards. Polls
 * every 10 minutes; news doesn't need a tighter cadence than that.
 */
export function NewsBar({ theme }: { theme: Theme }) {
  const { t, locale } = useLocale();
  const query = locale === "pt-BR" ? "NBA basquete" : "NBA basketball";
  const { data } = useLive<{ items: NewsItem[] }>(
    `/news?q=${encodeURIComponent(query)}&limit=12&lang=${encodeURIComponent(locale)}`,
    600_000,
  );
  const items = data?.items ?? [];

  return (
    <aside className="bg-primary text-primary-foreground sticky top-0 hidden h-screen w-80 shrink-0 flex-col rounded-tl-[2rem] lg:flex">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-heading text-lg font-bold tracking-tight">{t("news.title")}</h2>
        <ThemeToggle initial={theme} />
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-5">
        {items.length === 0 ? (
          <p className="px-2 py-4 text-sm text-primary-foreground/80">{t("news.empty")}</p>
        ) : (
          items.map((n, i) => (
            <a
              key={`${n.link}-${i}`}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-[#fff4ea] p-3 text-[#262422] transition-transform hover:-translate-y-0.5"
            >
              <p className="line-clamp-3 text-sm font-medium leading-snug">{n.title}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#89827c]">
                {n.source && <span className="font-medium">{n.source}</span>}
                {n.source && n.published && <span aria-hidden>·</span>}
                {n.published && <span>{timeAgo(n.published, locale)}</span>}
              </p>
            </a>
          ))
        )}
      </div>
    </aside>
  );
}
