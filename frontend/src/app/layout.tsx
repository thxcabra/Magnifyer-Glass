import type { Metadata, Viewport } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { NewsBar } from "@/components/news-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/components/locale-provider";
import { getServerLocale, getServerTheme } from "@/lib/locale-server";
import { translate } from "@/lib/i18n";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Rubik is the brand typeface — variable font, so we get the full weight range
// (normal body, bold headings) from a single load.
const rubik = Rubik({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Kept for tabular numerals (scores, tricodes, stat tables) via `font-mono`.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — NBA ao vivo, em português`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  keywords: [
    "NBA",
    "basquete",
    "basketball",
    "placares ao vivo",
    "classificação",
    "estatísticas",
    "calendário",
    "playoffs",
    "draft",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — NBA ao vivo, em português`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    alternateLocale: ["pt_BR"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — NBA ao vivo, em português`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#e36c04",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const theme = await getServerTheme();
  return (
    <html
      lang={locale}
      className={`${rubik.variable} ${geistMono.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
    >
      <body className="bg-background text-foreground min-h-full">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-full px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
        >
          {translate(locale, "common.skip_to_content")}
        </a>
        <LocaleProvider initialLocale={locale}>
          <TooltipProvider delayDuration={200}>
            {/* 3-column shell: left rail · scrolling content · orange news rail.
                Stacks to a single column with a top bar below the lg breakpoint. */}
            <div className="min-h-screen lg:flex">
              <Sidebar theme={theme} />
              <main id="main" className="min-w-0 flex-1">
                {children}
              </main>
              <NewsBar theme={theme} />
            </div>
          </TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
