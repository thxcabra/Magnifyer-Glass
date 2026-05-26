"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { useLocale } from "@/components/locale-provider";

const YEARS: number[] = Array.from({ length: 41 }, (_, i) => 2025 - i);

const DECADE_HEADERS: Array<{ label: string; range: [number, number] }> = [
  { label: "2020s", range: [2020, 2029] },
  { label: "2010s", range: [2010, 2019] },
  { label: "2000s", range: [2000, 2009] },
  { label: "1990s", range: [1990, 1999] },
  { label: "1980s", range: [1985, 1989] },
];

export default function DraftsIndexPage() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return new Set(YEARS);
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return new Set<number>();
    return new Set(YEARS.filter((y) => String(y).includes(digits)));
  }, [query]);

  return (
    <PageShell>
      <PageHeader kicker={t("nav.drafts")} title={t("drafts.title")} subtitle={t("drafts.sub")}>
        <div className="w-full max-w-xs sm:w-56">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("drafts.placeholder")}
            className="rounded-full"
          />
        </div>
      </PageHeader>

      <SectionCard>
        <div className="space-y-7">
          {DECADE_HEADERS.map(({ label, range }) => {
            const years = YEARS.filter(
              (y) => y >= range[0] && y <= range[1] && visible.has(y),
            );
            if (years.length === 0) return null;
            return (
              <section key={label}>
                <h3 className="text-muted-foreground mb-3 text-xs tracking-wide uppercase">
                  {label}
                </h3>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6">
                  {years.map((y) => (
                    <Link
                      key={y}
                      href={`/draft/${y}`}
                      className="bg-muted hover:bg-accent hover:text-accent-foreground rounded-2xl py-4 text-center transition-colors"
                    >
                      <div className="font-heading text-lg font-bold tracking-tight">{y}</div>
                      <div className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">
                        {t("common.draft")}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </SectionCard>
    </PageShell>
  );
}
