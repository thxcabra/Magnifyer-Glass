import type { Metadata } from "next";
import { api, type StandingsResponse } from "@/lib/api";
import { StandingsTable } from "@/components/standings-table";
import { PageShell, PageHeader } from "@/components/section-card";
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
    <PageShell>
      <PageHeader
        kicker={t("nav.standings")}
        title={t("standings.title")}
        subtitle={t("standings.sub")}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <StandingsTable title={t("standings.west")} rows={data?.west ?? []} />
        <StandingsTable title={t("standings.east")} rows={data?.east ?? []} />
      </div>
    </PageShell>
  );
}
