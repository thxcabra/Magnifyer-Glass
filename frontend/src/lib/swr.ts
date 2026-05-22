"use client";

import useSWR, { type SWRConfiguration } from "swr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function liveFetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/**
 * Polling hook for live endpoints. Defaults tuned for a "live" feel without
 * hammering the backend: refresh every 15s, pause while the tab is hidden,
 * and keep showing the last data during refetches so the UI never blanks.
 *
 * Pass `path = null` to disable (e.g. when a game is already Final).
 */
export function useLive<T>(
  path: string | null,
  intervalMs = 15000,
  options?: SWRConfiguration<T>,
) {
  return useSWR<T>(path, liveFetcher, {
    refreshInterval: intervalMs,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    keepPreviousData: true,
    dedupingInterval: 5000,
    ...options,
  });
}

/** One-shot fetch (no polling) — for lazy-loaded, slow-ish data like game logs. */
export function useApi<T>(path: string | null, options?: SWRConfiguration<T>) {
  return useSWR<T>(path, liveFetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    ...options,
  });
}
