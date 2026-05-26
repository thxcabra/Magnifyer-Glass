import type { Metadata } from "next";
import { api, type ScheduleResponse } from "@/lib/api";
import { ScheduleBrowser } from "@/components/schedule-browser";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
import { getServerT } from "@/lib/locale-server";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("schedule.title"),
    description: t("schedule.sub"),
    alternates: { canonical: "/calendario" },
  };
}

export default async function CalendarPage() {
  const { t } = await getServerT();

  let schedule: ScheduleResponse | null = null;
  try {
    schedule = await api.getSchedule({ next: { revalidate: 3600 } });
  } catch {
    schedule = null;
  }

  return (
    <PageShell>
      <PageHeader
        kicker={t("nav.schedule")}
        title={t("schedule.title")}
        subtitle={t("schedule.sub")}
      />
      <SectionCard>
        <ScheduleBrowser dates={schedule?.game_dates ?? []} />
      </SectionCard>
    </PageShell>
  );
}
