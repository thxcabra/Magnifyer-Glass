/**
 * Pure formatting helpers for live game data. Locale-independent math;
 * display strings (AO VIVO / Final / quarter labels) are localized in the
 * components via i18n. Time-of-day is shown in Brasília time for the
 * Brazilian audience.
 */

/** Game status codes from the NBA CDN. */
export const GAME_STATUS = { SCHEDULED: 1, LIVE: 2, FINAL: 3 } as const;

/** "PT01M30.00S" -> "1:30". Returns "" when there's no usable clock. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /PT(\d+)M(\d+)(?:\.\d+)?S/.exec(iso);
  if (!m) return "";
  const minutes = parseInt(m[1], 10);
  const seconds = parseInt(m[2], 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** True when the game is/was in overtime (period beyond the 4 regulation Qs). */
export function isOvertime(period: number | null | undefined): boolean {
  return (period ?? 0) > 4;
}

/** Relative time, e.g. "há 2 horas" / "2 hours ago". Locale-aware. */
export function timeAgo(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffSec = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale === "pt-BR" ? "pt" : "en", {
    numeric: "auto",
  });
  if (abs < 90) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / 2592000), "month");
}

/** Box-score minutes "PT34M16.90S" -> "34". Returns "" when not played. */
export function formatMinutes(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /PT(\d+)M/.exec(iso);
  if (!m) return "";
  return m[1].replace(/^0+(?=\d)/, "");
}

/** Tip-off time in Brasília, e.g. "21:30". */
export function formatTipoffBrasilia(utcIso: string | null | undefined): string {
  if (!utcIso) return "";
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Short weekday + day in Brasília, e.g. "ter, 19/05". */
export function formatDateBrasilia(utcIso: string | null | undefined): string {
  if (!utcIso) return "";
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}
