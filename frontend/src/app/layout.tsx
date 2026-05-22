import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { LiveTicker } from "@/components/live-ticker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/components/locale-provider";
import { getServerLocale, getServerTheme } from "@/lib/locale-server";
import { translate } from "@/lib/i18n";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
  themeColor: "#0a0a0a",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-50 rounded px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
        >
          {translate(locale, "common.skip_to_content")}
        </a>
        <LocaleProvider initialLocale={locale}>
          <TooltipProvider delayDuration={200}>
            <Nav theme={theme} />
            <LiveTicker />
            <main id="main" className="flex-1">
              {children}
            </main>
          </TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
