import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TeamLogo } from "@/components/team-logo";
import { ScoreboardGrid } from "@/components/scoreboard-grid";
import { NewsList } from "@/components/news-list";
import { PageShell, SectionCard } from "@/components/section-card";
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

const FEATURED_TEAMS = ["LAL", "BOS", "DEN", "GSW", "MIL", "OKC", "NYK", "PHX"];
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
        6,
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
    <PageShell>
      {/* Hero — a contained, generously rounded brand card */}
      <section className="relative isolate overflow-hidden rounded-[2rem] ring-1 ring-foreground/10">
        <Image
          src={heroBg}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover object-[center_18%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20"
        />
        <div className="relative px-6 py-14 sm:px-10 sm:py-20">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#ffb27a] uppercase">
            {t("home.kicker")}
          </p>
          <h1 className="font-heading mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {t("home.title_line1")}{" "}
            <span className="text-[#ff9a5a]">{t("home.title_line2")}</span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
            {t("home.lead")}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/jogos"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-full px-6 text-base font-semibold transition-colors"
            >
              {t("home.cta_games")}
            </Link>
            <Link
              href="/teams"
              className="inline-flex h-11 items-center rounded-full border border-white/25 bg-white/10 px-6 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              {t("home.cta_teams")}
            </Link>
          </div>
          {featuredPhoto?.url && (
            <Link
              href={`/players/${featuredSlug}`}
              className="mt-5 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
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

      {/* Today's games — live */}
      <SectionCard
        title={t("home.todays_games")}
        action={{ href: "/jogos", label: t("home.see_all_games") }}
      >
        <ScoreboardGrid initialData={initialGames} />
      </SectionCard>

      {/* News — only on small screens; the orange rail owns this on lg+ */}
      {news.length > 0 && (
        <div className="lg:hidden">
          <SectionCard title={t("news.title")}>
            <NewsList items={news} locale={locale} />
          </SectionCard>
        </div>
      )}

      {/* Hot pages — featured franchises as an Awards-style sub-card grid */}
      <SectionCard
        title={t("home.featured_franchises")}
        action={{ href: "/teams", label: t("home.all_teams") }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURED_TEAMS.map((abbr) => (
            <Link
              key={abbr}
              href={`/teams/${abbr}`}
              className="bg-muted hover:bg-accent hover:text-accent-foreground flex flex-col items-center gap-2.5 rounded-2xl py-6 transition-colors"
            >
              <TeamLogo team={abbr} size={52} />
              <span className="font-mono text-sm font-medium">{abbr}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* Recent drafts — the differentiator */}
      <SectionCard
        title={t("home.recent_drafts")}
        action={{ href: "/drafts", label: t("home.all_drafts") }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {RECENT_DRAFTS.map((y) => (
            <Link
              key={y}
              href={`/draft/${y}`}
              className="bg-muted hover:bg-accent hover:text-accent-foreground rounded-2xl py-6 text-center transition-colors"
            >
              <div className="font-heading text-2xl font-bold tracking-tight">{y}</div>
              <div className="text-muted-foreground mt-1 text-[11px] tracking-wider uppercase">
                {t("home.draft_class")}
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}
