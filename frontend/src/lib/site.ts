export const SITE_NAME = "Magnifyer Glass";

export const SITE_DESCRIPTION =
  "Follow the NBA: live scores, stats, teams, players, drafts and history, in one fast site.";

export const SITE_DESCRIPTION_PT =
  "Acompanhe a NBA: placares ao vivo, estatísticas, times, jogadores, drafts e história, em português.";

const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;

export const SITE_URL = (
  fromEnv && /^https?:\/\//.test(fromEnv) ? fromEnv : "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return SITE_URL + path;
}
