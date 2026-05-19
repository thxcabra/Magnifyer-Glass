"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { COOKIE_NAME, DEFAULT_LOCALE, translate, type Locale } from "@/lib/i18n";

interface LocaleCtx {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (next: Locale) => void;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();

  // The server already rendered with the right locale, so we keep using the
  // value the layout passed in. Clicking the switcher writes the cookie and
  // hits router.refresh() so the server re-renders with the new value.
  const setLocale = useCallback(
    (next: Locale) => {
      // 1 year cookie, scoped to whole site. SameSite=Lax is the default for
      // user-set cookies; we set it explicitly to silence the warning.
      document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LocaleCtx>(
    () => ({
      locale: initialLocale,
      t: (key, vars) => translate(initialLocale, key, vars),
      setLocale,
    }),
    [initialLocale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Should never happen at runtime (LocaleProvider wraps the app), but the
    // guard saves us from a confusing "undefined.t" error during refactors.
    return {
      locale: DEFAULT_LOCALE,
      t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
      setLocale: () => {},
    };
  }
  return ctx;
}
