/**
 * Theme is cookie-driven (mirrors the i18n setup) so the server can render the
 * right palette on the first paint — no flash of the wrong theme.
 */

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";
export const THEME_COOKIE = "magnifyer-theme";

export function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark";
}
