import type { Metadata } from "next";
import { api, type StandingsResponse } from "@/lib/api";
import { StandingsTable } from "@/components/standings-table";
import { getServerT } from "@/lib/locale-server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("standings.title"),
    description: t("standings.sub"),
    alternates: { canonical: "/classificacao" },
  };
}

export default async function StandingsPage() {
  const { t } = await getServerT();

  let data: StandingsResponse | null = null;
  try {
    data = await api.getStandings({ next: { revalidate: 300 } });
  } catch {
    data = null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {t("nav.standings")}
      </p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight">
        {t("standings.title")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("standings.sub")}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <StandingsTable title={t("standings.west")} rows={data?.west ?? []} />
        <StandingsTable title={t("standings.east")} rows={data?.east ?? []} />
      </div>
    </div>
  );
}
