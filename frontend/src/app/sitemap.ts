import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

const AWARD_SLUGS = [
  "champion",
  "mvp",
  "finals_mvp",
  "dpoy",
  "roy",
  "sixth_man",
  "most_improved",
  "clutch_player",
  "all_star_mvp",
  "all_nba_first",
  "all_nba_second",
  "all_nba_third",
  "all_defensive_first",
  "all_defensive_second",
  "all_rookie_first",
  "all_rookie_second",
  "scoring_title",
  "assists_title",
  "rebounding_title",
  "steals_title",
  "blocks_title",
  "hof_inductee",
];

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/jogos", changeFrequency: "always", priority: 0.9 },
  { path: "/classificacao", changeFrequency: "daily", priority: 0.8 },
  { path: "/playoffs", changeFrequency: "daily", priority: 0.8 },
  { path: "/calendario", changeFrequency: "weekly", priority: 0.7 },
  { path: "/players", changeFrequency: "daily", priority: 0.9 },
  { path: "/teams", changeFrequency: "weekly", priority: 0.9 },
  { path: "/drafts", changeFrequency: "yearly", priority: 0.7 },
  { path: "/years", changeFrequency: "monthly", priority: 0.7 },
  { path: "/lists", changeFrequency: "monthly", priority: 0.7 },
];

const DRAFT_YEAR_START = 1985;
const DRAFT_YEAR_END = new Date().getFullYear() + 1;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const r of STATIC_ROUTES) {
    entries.push({
      url: absoluteUrl(r.path),
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    });
  }

  for (let y = DRAFT_YEAR_START; y <= DRAFT_YEAR_END; y++) {
    entries.push({
      url: absoluteUrl(`/draft/${y}`),
      lastModified: now,
      changeFrequency: y >= DRAFT_YEAR_END - 1 ? "weekly" : "yearly",
      priority: y >= DRAFT_YEAR_END - 1 ? 0.8 : 0.5,
    });
  }

  for (const slug of AWARD_SLUGS) {
    entries.push({
      url: absoluteUrl(`/lists/${slug}`),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    });
  }

  // Best-effort dynamic entries: if the backend is unreachable at build time,
  // ship the static portion rather than failing the whole sitemap. Search
  // engines will pick up the dynamic URLs on the next regeneration.
  try {
    const teams = await api.listTeams();
    for (const t of teams) {
      entries.push({
        url: absoluteUrl(`/teams/${t.abbreviation}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn("[sitemap] listTeams failed; skipping team URLs", err);
  }

  try {
    const seasons = await api.listYears();
    for (const s of seasons) {
      entries.push({
        url: absoluteUrl(`/years/${s}`),
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.5,
      });
    }
  } catch (err) {
    console.warn("[sitemap] listYears failed; skipping year URLs", err);
  }

  try {
    const players = await api.listProspects({
      include_nba: true,
      has_archetype: true,
      limit: 1000,
    } as Parameters<typeof api.listProspects>[0]);
    for (const p of players) {
      entries.push({
        url: absoluteUrl(`/players/${p.slug}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.warn("[sitemap] listProspects failed; skipping player URLs", err);
  }

  return entries;
}
