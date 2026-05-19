"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api, type Archetype } from "@/lib/api";
import { ARCHETYPE_META } from "@/lib/stat-meta";
import { PlayerHeadshot } from "./player-headshot";
import { TeamLogo } from "./team-logo";
import { useLocale } from "./locale-provider";

type PlayerHit = Awaited<ReturnType<typeof api.searchPlayers>>[number];

const DEBOUNCE_MS = 140;
const RECENTS_KEY = "magnifyer:kbar:recents";
const RECENTS_MAX = 5;

interface RecentEntry {
  kind: "player" | "team" | "draft" | "archetype";
  href: string;
  label: string;
  /** Optional NBA external id for player headshots */
  externalId?: string | null;
  /** Direct headshot URL when known */
  headshotUrl?: string | null;
  /** Team abbreviation for the TeamLogo fallback */
  team?: string;
  /** Right-side meta (position · team · year) */
  meta?: string;
}

function loadRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function pushRecent(entry: RecentEntry): void {
  if (typeof window === "undefined") return;
  const existing = loadRecents().filter((r) => r.href !== entry.href);
  const next = [entry, ...existing].slice(0, RECENTS_MAX);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* quota or private-mode - silently swallow */
  }
}

// Static team list - abbreviation + name. Kept here so search is instant
// (no API call) and matches the 30 currently-active franchises.
const TEAM_INDEX: { abbr: string; full: string; city: string }[] = [
  { abbr: "ATL", full: "Atlanta Hawks", city: "Atlanta" },
  { abbr: "BOS", full: "Boston Celtics", city: "Boston" },
  { abbr: "BKN", full: "Brooklyn Nets", city: "Brooklyn" },
  { abbr: "CHA", full: "Charlotte Hornets", city: "Charlotte" },
  { abbr: "CHI", full: "Chicago Bulls", city: "Chicago" },
  { abbr: "CLE", full: "Cleveland Cavaliers", city: "Cleveland" },
  { abbr: "DAL", full: "Dallas Mavericks", city: "Dallas" },
  { abbr: "DEN", full: "Denver Nuggets", city: "Denver" },
  { abbr: "DET", full: "Detroit Pistons", city: "Detroit" },
  { abbr: "GSW", full: "Golden State Warriors", city: "Golden State" },
  { abbr: "HOU", full: "Houston Rockets", city: "Houston" },
  { abbr: "IND", full: "Indiana Pacers", city: "Indiana" },
  { abbr: "LAC", full: "Los Angeles Clippers", city: "Los Angeles" },
  { abbr: "LAL", full: "Los Angeles Lakers", city: "Los Angeles" },
  { abbr: "MEM", full: "Memphis Grizzlies", city: "Memphis" },
  { abbr: "MIA", full: "Miami Heat", city: "Miami" },
  { abbr: "MIL", full: "Milwaukee Bucks", city: "Milwaukee" },
  { abbr: "MIN", full: "Minnesota Timberwolves", city: "Minnesota" },
  { abbr: "NOP", full: "New Orleans Pelicans", city: "New Orleans" },
  { abbr: "NYK", full: "New York Knicks", city: "New York" },
  { abbr: "OKC", full: "Oklahoma City Thunder", city: "Oklahoma City" },
  { abbr: "ORL", full: "Orlando Magic", city: "Orlando" },
  { abbr: "PHI", full: "Philadelphia 76ers", city: "Philadelphia" },
  { abbr: "PHX", full: "Phoenix Suns", city: "Phoenix" },
  { abbr: "POR", full: "Portland Trail Blazers", city: "Portland" },
  { abbr: "SAC", full: "Sacramento Kings", city: "Sacramento" },
  { abbr: "SAS", full: "San Antonio Spurs", city: "San Antonio" },
  { abbr: "TOR", full: "Toronto Raptors", city: "Toronto" },
  { abbr: "UTA", full: "Utah Jazz", city: "Utah" },
  { abbr: "WAS", full: "Washington Wizards", city: "Washington" },
];

const DRAFT_YEARS: number[] = Array.from({ length: 40 }, (_, i) => 2025 - i);

const ARCHETYPE_ENTRIES = Object.entries(ARCHETYPE_META) as [Archetype, typeof ARCHETYPE_META[Archetype]][];

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Slugs with diacritics (luka-dončić, nikola-jokić) can survive a round-trip
 * through router.push, but some chromium versions mangle the URL bar display
 * and the in-memory state. To be safe we always send the diacritic-stripped
 * form when navigating from k-bar - the backend has a fallback that resolves
 * it back to the accented slug on the way in.
 */
function safeSlug(slug: string): string {
  return slug
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function KBar() {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [playerHits, setPlayerHits] = useState<PlayerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  useEffect(() => setRecents(loadRecents()), []);
  const inflight = useRef<AbortController | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setPlayerHits([]);
      setLoading(false);
      return;
    }

    debounce.current = setTimeout(async () => {
      inflight.current?.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;
      setLoading(true);
      try {
        const res = await api.searchPlayers(query.trim(), 8);
        if (!ctrl.signal.aborted) setPlayerHits(res);
      } catch (err) {
        if (!ctrl.signal.aborted) {
          console.error("search failed", err);
          setPlayerHits([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const trimmed = query.trim();

  const teamHits = useMemo(() => {
    if (!trimmed) return [];
    return TEAM_INDEX.filter(
      (t) => matches(t.full, trimmed) || matches(t.abbr, trimmed) || matches(t.city, trimmed),
    ).slice(0, 5);
  }, [trimmed]);

  const draftHits = useMemo(() => {
    if (!trimmed) return [];
    // Match exact year, "draft <year>", or "<year> draft"
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return [];
    return DRAFT_YEARS.filter((y) => String(y).startsWith(digits)).slice(0, 5);
  }, [trimmed]);

  const archetypeHits = useMemo(() => {
    if (!trimmed) return [];
    return ARCHETYPE_ENTRIES.filter(
      ([, meta]) => matches(meta.label, trimmed) || matches(meta.description, trimmed),
    ).slice(0, 4);
  }, [trimmed]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const go = useCallback(
    (path: string, recent?: RecentEntry) => {
      close();
      if (recent) {
        pushRecent(recent);
        setRecents(loadRecents());
      }
      router.push(path);
    },
    [router],
  );

  const empty =
    playerHits.length === 0 &&
    teamHits.length === 0 &&
    draftHits.length === 0 &&
    archetypeHits.length === 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("nav.search")}
      description={t("kbar.placeholder")}
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t("kbar.placeholder")}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? t("common.loading") : trimmed && empty ? t("kbar.empty") : t("kbar.type_to_search")}
          </CommandEmpty>

          {!trimmed && recents.length > 0 && (
            <CommandGroup heading={t("kbar.recents")}>
              {recents.map((r) => (
                <CommandItem
                  key={`r-${r.href}`}
                  value={`recent-${r.href}`}
                  onSelect={() => go(r.href)}
                  className="flex items-center gap-3"
                >
                  {r.kind === "player" ? (
                    <PlayerHeadshot
                      externalId={r.externalId ?? null}
                      url={r.headshotUrl ?? null}
                      name={r.label}
                      size={28}
                    />
                  ) : r.kind === "team" && r.team ? (
                    <TeamLogo team={r.team} size={28} />
                  ) : (
                    <span className="text-muted-foreground inline-flex size-7 items-center justify-center rounded-md border text-[10px]">
                      {r.kind === "draft" ? "🎯" : "★"}
                    </span>
                  )}
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="font-medium">{r.label}</span>
                    {r.meta && (
                      <span className="text-muted-foreground text-xs">{r.meta}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {playerHits.length > 0 && (
            <CommandGroup heading={t("kbar.players")}>
              {playerHits.map((h) => (
                <CommandItem
                  key={`p-${h.id}`}
                  // cmdk uses `value` internally for fuzzy matching. Keying off
                  // the stable uuid (instead of the slug) avoids surrogate-pair
                  // issues for players whose slug includes diacritics.
                  value={`player-${h.id}`}
                  onSelect={() =>
                    go(`/players/${safeSlug(h.slug)}`, {
                      kind: "player",
                      href: `/players/${safeSlug(h.slug)}`,
                      label: h.name,
                      externalId: h.external_id,
                      headshotUrl: h.headshot_url,
                      meta: [h.position, h.current_team].filter(Boolean).join(" · "),
                    })
                  }
                  className="flex items-center gap-3"
                >
                  <PlayerHeadshot
                    externalId={h.external_id}
                    url={h.headshot_url}
                    name={h.name}
                    size={32}
                  />
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="font-medium">
                      {h.name}
                      {h.jersey_number && (
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          #{h.jersey_number}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {[h.position, h.current_team, h.draft_class].filter(Boolean).join(" · ")}
                      {h.is_nba ? "" : " · prospect"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {teamHits.length > 0 && (
            <CommandGroup heading={t("kbar.teams")}>
              {teamHits.map((t) => (
                <CommandItem
                  key={`t-${t.abbr}`}
                  value={`team-${t.abbr}`}
                  onSelect={() =>
                    go(`/teams/${t.abbr}`, {
                      kind: "team",
                      href: `/teams/${t.abbr}`,
                      label: t.full,
                      team: t.abbr,
                      meta: t.abbr,
                    })
                  }
                  className="flex items-center gap-3"
                >
                  <TeamLogo team={t.abbr} size={28} />
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="font-medium">{t.full}</span>
                    <span className="text-muted-foreground font-mono text-xs">{t.abbr}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {draftHits.length > 0 && (
            <CommandGroup heading={t("kbar.drafts")}>
              {draftHits.map((y) => (
                <CommandItem
                  key={`d-${y}`}
                  value={`draft-${y}`}
                  onSelect={() =>
                    go(`/draft/${y}`, {
                      kind: "draft",
                      href: `/draft/${y}`,
                      label: `${y} NBA Draft`,
                      meta: "draft",
                    })
                  }
                  className="flex items-center justify-between gap-3"
                >
                  <span className="font-medium">{y} NBA Draft</span>
                  <span className="text-muted-foreground text-xs">/draft/{y}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {archetypeHits.length > 0 && (
            <CommandGroup heading={t("kbar.archetypes")}>
              {archetypeHits.map(([key, meta]) => (
                <CommandItem
                  key={`a-${key}`}
                  value={`archetype-${key}`}
                  onSelect={() =>
                    go(`/discovery?archetype=${key}`, {
                      kind: "archetype",
                      href: `/discovery?archetype=${key}`,
                      label: meta.label,
                      meta: "archetype",
                    })
                  }
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-muted-foreground line-clamp-1 text-xs">
                    {meta.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        <div className="text-muted-foreground flex items-center gap-4 border-t px-3 py-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="bg-muted rounded border px-1.5 font-mono text-[10px]">↑↓</kbd>
            {t("kbar.hint_nav")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="bg-muted rounded border px-1.5 font-mono text-[10px]">↵</kbd>
            {t("kbar.hint_enter")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="bg-muted rounded border px-1.5 font-mono text-[10px]">esc</kbd>
            {t("kbar.hint_close")}
          </span>
          {!trimmed && recents.length > 0 && (
            <span className="ml-auto">
              {t("kbar.recent_count", { n: recents.length })}
            </span>
          )}
        </div>
      </Command>
    </CommandDialog>
  );
}

export function KBarTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      }}
      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
    >
      <span className="text-xs">Search anything</span>
      <kbd className="bg-muted text-muted-foreground pointer-events-none ml-2 inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
