import type { Metadata } from "next";
import { api, type ScheduleResponse } from "@/lib/api";
import { ScheduleBrowser } from "@/components/schedule-browser";
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
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {t("nav.schedule")}
      </p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight">
        {t("schedule.title")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("schedule.sub")}</p>

      <ScheduleBrowser dates={schedule?.game_dates ?? []} />
    </div>
  );
}
