import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-logo";
import { getServerT } from "@/lib/locale-server";

const FEATURED_TEAMS = ["LAL", "BOS", "DEN", "GSW", "MIL", "OKC"];
const RECENT_DRAFTS = [2025, 2024, 2023, 2022, 2021];

export default async function HomePage() {
  const { t } = await getServerT();
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card px-8 py-12 md:px-16 md:py-20">
        <div
          aria-hidden
          className="bg-primary/15 absolute -right-32 -top-32 h-72 w-72 rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="bg-primary/10 absolute -bottom-40 -left-20 h-72 w-72 rounded-full blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            {t("home.kicker")}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            {t("home.title_line1")}
            <br />
            <span className="text-primary">{t("home.title_line2")}</span>
          </h1>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            {t("home.lead")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/players"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-5 text-sm font-medium"
            >
              {t("home.cta_players")}
            </Link>
            <Link
              href="/teams"
              className="hover:bg-accent inline-flex h-10 items-center rounded-md border px-5 text-sm font-medium"
            >
              {t("home.cta_teams")}
            </Link>
            <span className="text-muted-foreground text-sm">
              {t("home.or_press")}{" "}
              <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
            </span>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t("home.recent_drafts")}</h2>
          <Link
            href="/drafts"
            className="text-muted-foreground hover:text-foreground text-xs underline decoration-dotted"
          >
            {t("home.all_drafts")}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {RECENT_DRAFTS.map((y) => (
            <Link key={y} href={`/draft/${y}`}>
              <Card className="hover:bg-accent/40 transition-colors">
                <CardContent className="py-5 text-center">
                  <div className="text-2xl font-semibold tracking-tight">{y}</div>
                  <div className="text-muted-foreground mt-1 text-[10px] tracking-wider uppercase">
                    {t("home.draft_class")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t("home.featured_franchises")}</h2>
          <Link
            href="/teams"
            className="text-muted-foreground hover:text-foreground text-xs underline decoration-dotted"
          >
            {t("home.all_teams")}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {FEATURED_TEAMS.map((abbr) => (
            <Link key={abbr} href={`/teams/${abbr}`}>
              <Card className="hover:bg-accent/40 transition-colors">
                <CardContent className="flex flex-col items-center gap-2 py-5">
                  <TeamLogo team={abbr} size={48} />
                  <div className="text-muted-foreground font-mono text-xs">{abbr}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <div className="text-primary text-xs font-semibold tracking-wider uppercase">
              {t("home.how_data_kicker")}
            </div>
            <div className="mt-2 text-base font-medium">{t("home.how_data_title")}</div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t("home.how_data_body")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-primary text-xs font-semibold tracking-wider uppercase">
              {t("home.how_arch_kicker")}
            </div>
            <div className="mt-2 text-base font-medium">{t("home.how_arch_title")}</div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t("home.how_arch_body")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-primary text-xs font-semibold tracking-wider uppercase">
              {t("home.how_sim_kicker")}
            </div>
            <div className="mt-2 text-base font-medium">{t("home.how_sim_title")}</div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t("home.how_sim_body")}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
