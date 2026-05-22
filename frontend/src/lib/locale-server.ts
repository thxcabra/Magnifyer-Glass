import { cookies, headers } from "next/headers";
import { COOKIE_NAME, isLocale, translate, type Locale } from "./i18n";
import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from "./theme";

/** Server-component helper: reads the theme cookie. Defaults to dark. */
export async function getServerTheme(): Promise<Theme> {
  const store = await cookies();
  const v = store.get(THEME_COOKIE)?.value;
  return isTheme(v) ? v : DEFAULT_THEME;
}

/**
 * Active locale: an explicit cookie choice wins; otherwise we detect from the
 * browser's Accept-Language. This is a Brazilian-first product, so anything
 * that isn't clearly English falls back to pt-BR.
 */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(COOKIE_NAME)?.value;
  if (isLocale(v)) return v;

  const al = ((await headers()).get("accept-language") || "").toLowerCase();
  const first = al.split(",")[0]?.trim() ?? "";
  if (first.startsWith("en")) return "en";
  if (first.startsWith("pt")) return "pt-BR";
  return al.includes("en") && !al.includes("pt") ? "en" : "pt-BR";
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
