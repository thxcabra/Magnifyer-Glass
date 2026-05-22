import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-logo";
import { ScoreboardGrid } from "@/components/scoreboard-grid";
import { NewsList } from "@/components/news-list";
import { api, type LiveScoreboard, type NewsItem } from "@/lib/api";
import { getServerT } from "@/lib/locale-server";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: {
      absolute: `${SITE_NAME} — ${t("home.title_line1")} ${t("home.title_line2")}`,
    },
    alternates: { canonical: "/" },
  };
}

const FEATURED_TEAMS = ["LAL", "BOS", "DEN", "GSW", "MIL", "OKC"];
const RECENT_DRAFTS = [2025, 2024, 2023, 2022, 2021];

// Unsplash (free license) — dramatic indoor court. Used as the hero fallback
// when the featured player's photo can't be loaded.
const HERO_IMG =
  "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=88&w=2400&auto=format&fit=crop";

// Rotating marquee of stars whose names slugify cleanly (no apostrophes/dots).
const MARQUEE = [
  "Nikola Jokić",
  "Luka Dončić",
  "Shai Gilgeous-Alexander",
  "Giannis Antetokounmpo",
  "Victor Wembanyama",
  "Stephen Curry",
  "Jayson Tatum",
  "Anthony Edwards",
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export default async function HomePage() {
  const { t, locale } = await getServerT();

  // Featured player rotates by day; their free Wikimedia action photo becomes
  // the hero backdrop (falls back to the generic court shot).
  const featuredName = MARQUEE[new Date().getDate() % MARQUEE.length];
  const featuredSlug = slugify(featuredName);

  // Independent fetches run in parallel for a faster first paint.
  const [initialGames, news, featuredPhoto] = await Promise.all([
    api
      .getScoreboard({ cache: "no-store" })
      .catch(() => undefined as LiveScoreboard | undefined),
    api
      .getNews(
        locale === "pt-BR" ? "NBA basquete" : "NBA basketball",
        8,
        locale,
        { next: { revalidate: 900 } },
      )
      .then((r) => r.items)
      .catch(() => [] as NewsItem[]),
    api
      .getPlayerPhoto(featuredName, { next: { revalidate: 86400 } })
      .catch(() => null),
  ]);
  const heroBg = featuredPhoto?.url ?? HERO_IMG;

  return (
    <div>
      {/* Hero — photographic, full-bleed */}
      <section className="relative isolate overflow-hidden border-b">
        <Image
          src={heroBg}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_18%]"
        />
        {/* Fixed dark scrim for text legibility + a fade to the page
            background at the bottom so the hero blends into either theme. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent"
        />
        <div
          aria-hidden
          className="to-background absolute inset-0 bg-gradient-to-t from-transparent via-transparent"
        />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-36">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            {t("home.kicker")}
          </p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-white md:text-7xl">
            {t("home.title_line1")}{" "}
            <span className="text-primary">{t("home.title_line2")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            {t("home.lead")}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/jogos"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-6 text-base font-semibold transition-colors"
            >
              {t("home.cta_games")}
            </Link>
            <Link
              href="/teams"
              className="inline-flex h-11 items-center rounded-md border border-white/25 bg-white/10 px-6 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              {t("home.cta_teams")}
            </Link>
            <span className="hidden text-sm text-white/70 sm:inline">
              {t("home.or_press")}{" "}
              <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-xs">
                ⌘K
              </kbd>
            </span>
          </div>
          {featuredPhoto?.url && (
            <Link
              href={`/players/${featuredSlug}`}
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <span className="bg-primary size-1.5 rounded-full" aria-hidden />
              {t("home.featured")}:{" "}
              <span className="font-medium text-white">{featuredName}</span> →
            </Link>
          )}
        </div>
        {featuredPhoto?.url && (
          <a
            href={featuredPhoto.source_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2 bottom-1 z-10 text-[10px] text-white/50 hover:text-white/80"
          >
            {featuredPhoto.author ? `Foto: ${featuredPhoto.author}` : "Foto"}
            {featuredPhoto.license ? ` · ${featuredPhoto.license}` : ""} · Wikimedia
          </a>
        )}
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-6 py-14">
        {/* Today's games — live */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="border-primary border-l-4 pl-3 text-2xl font-bold tracking-tight">
              {t("home.todays_games")}
            </h2>
            <Link
              href="/jogos"
              className="text-muted-foreground hover:text-foreground text-sm underline decoration-dotted"
            >
              {t("home.see_all_games")}
            </Link>
          </div>
          <ScoreboardGrid initialData={initialGames} />
        </section>

        {news.length > 0 && (
          <section>
            <h2 className="border-primary border-l-4 pl-3 text-2xl font-bold tracking-tight">
              {t("news.title")}
            </h2>
            <div className="mt-5 rounded-lg border bg-card p-4">
              <NewsList items={news} locale={locale} />
            </div>
          </section>
        )}

        {/* Featured teams */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="border-primary border-l-4 pl-3 text-2xl font-bold tracking-tight">
              {t("home.featured_franchises")}
            </h2>
            <Link
              href="/teams"
              className="text-muted-foreground hover:text-foreground text-sm underline decoration-dotted"
            >
              {t("home.all_teams")}
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FEATURED_TEAMS.map((abbr) => (
              <Link key={abbr} href={`/teams/${abbr}`}>
                <Card className="hover:bg-accent/40 hover:border-primary/30 transition-colors">
                  <CardContent className="flex flex-col items-center gap-2.5 py-6">
                    <TeamLogo team={abbr} size={56} />
                    <div className="text-muted-foreground font-mono text-sm">
                      {abbr}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent drafts — secondary differentiator */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="border-primary border-l-4 pl-3 text-2xl font-bold tracking-tight">
              {t("home.recent_drafts")}
            </h2>
            <Link
              href="/drafts"
              className="text-muted-foreground hover:text-foreground text-sm underline decoration-dotted"
            >
              {t("home.all_drafts")}
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {RECENT_DRAFTS.map((y) => (
              <Link key={y} href={`/draft/${y}`}>
                <Card className="hover:bg-accent/40 hover:border-primary/30 transition-colors">
                  <CardContent className="py-6 text-center">
                    <div className="text-2xl font-bold tracking-tight">{y}</div>
                    <div className="text-muted-foreground mt-1 text-[11px] tracking-wider uppercase">
                      {t("home.draft_class")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
