"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("nav.drafts")}</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">{t("drafts.title")}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("drafts.sub")}</p>

      <div className="mt-6 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("drafts.placeholder")}
          className="text-sm"
        />
      </div>

      <div className="mt-10 space-y-8">
        {DECADE_HEADERS.map(({ label, range }) => {
          const years = YEARS.filter(
            (y) => y >= range[0] && y <= range[1] && visible.has(y),
          );
          if (years.length === 0) return null;
          return (
            <section key={label}>
              <h2 className="text-muted-foreground border-b pb-2 text-xs tracking-wide uppercase">
                {label}
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {years.map((y) => (
                  <Link key={y} href={`/draft/${y}`}>
                    <Card className="hover:bg-accent/40 transition-colors">
                      <CardContent className="py-4 text-center">
                        <div className="text-lg font-semibold tracking-tight">{y}</div>
                        <div className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">
                          {t("common.draft")}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
