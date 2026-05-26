"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { useLocale } from "@/components/locale-provider";
import { api } from "@/lib/api";

export default function YearsIndexPage() {
  const { t } = useLocale();
  const [seasons, setSeasons] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listYears()
      .then((data) => setSeasons(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return seasons;
    return seasons.filter((s) => s.includes(trimmed));
  }, [seasons, query]);

  return (
    <PageShell>
      <PageHeader
        kicker={t("nav.years")}
        title={t("years.all_years")}
        subtitle={t("years.index_sub")}
      >
        <div className="w-full max-w-xs sm:w-56">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("years.index_placeholder")}
            className="rounded-full"
          />
        </div>
      </PageHeader>

      <SectionCard>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted rounded-2xl py-5 text-center font-mono text-sm opacity-50"
                >
                  …
                </div>
              ))
            : visible.map((s) => (
                <Link
                  key={s}
                  href={`/years/${s}`}
                  className="bg-muted hover:bg-accent hover:text-accent-foreground rounded-2xl py-5 text-center transition-colors"
                >
                  <div className="font-heading text-lg font-bold tracking-tight">{s}</div>
                </Link>
              ))}
        </div>

        {!loading && visible.length === 0 && (
          <p className="text-muted-foreground mt-6 text-center text-sm">
            {t("common.no_matches")}
          </p>
        )}
      </SectionCard>
    </PageShell>
  );
}
