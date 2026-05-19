"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {t("nav.years")}
      </p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">
        {t("years.all_years")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("years.index_sub")}</p>

      <div className="mt-6 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("years.index_placeholder")}
        />
      </div>

      <div className="mt-10 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="opacity-50">
                <CardContent className="py-5 text-center font-mono text-sm">
                  ...
                </CardContent>
              </Card>
            ))
          : visible.map((s) => (
              <Link key={s} href={`/years/${s}`}>
                <Card className="hover:bg-accent/40 transition-colors">
                  <CardContent className="py-5 text-center">
                    <div className="font-mono text-lg font-semibold tracking-tight">{s}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {!loading && visible.length === 0 && (
        <p className="text-muted-foreground mt-10 text-sm">{t("common.no_matches")}</p>
      )}
    </div>
  );
}
