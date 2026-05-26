import type { Metadata } from "next";
import { api, type PlayoffsResponse } from "@/lib/api";
import { PlayoffsBracket } from "@/components/playoffs-bracket";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { getServerT } from "@/lib/locale-server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("playoffs.title"),
    description: t("playoffs.sub"),
    alternates: { canonical: "/playoffs" },
  };
}

export default async function PlayoffsPage() {
  const { t } = await getServerT();

  let data: PlayoffsResponse | null = null;
  try {
    data = await api.getPlayoffs({ next: { revalidate: 300 } });
  } catch {
    data = null;
  }

  const series = data?.series ?? [];

  return (
    <PageShell>
      <PageHeader title={t("playoffs.title")} subtitle={t("playoffs.sub")} />
      <SectionCard>
        {series.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("playoffs.empty")}</p>
        ) : (
          <PlayoffsBracket
            series={series}
            labels={{
              r1: t("years.first_round"),
              r2: t("years.conf_semis"),
              r3: t("years.conf_finals"),
              finals: t("years.finals"),
            }}
          />
        )}
      </SectionCard>
    </PageShell>
  );
}
