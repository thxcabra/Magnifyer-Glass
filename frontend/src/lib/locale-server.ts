import { cookies } from "next/headers";
import { COOKIE_NAME, DEFAULT_LOCALE, isLocale, translate, type Locale } from "./i18n";

/**
 * Server-component helper: reads the locale cookie and returns the active
 * locale + a bound translate function. Call from any `async` page or layout.
 */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(COOKIE_NAME)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function getServerT(): Promise<{
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}> {
  const locale = await getServerLocale();
  return {
    locale,
    t: (key, vars) => translate(locale, key, vars),
  };
}
