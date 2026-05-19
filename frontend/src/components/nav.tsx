"use client";

import Link from "next/link";
import { KBar, KBarTrigger } from "./k-bar";
import { LocaleSwitcher } from "./locale-switcher";
import { useLocale } from "./locale-provider";

export function Nav() {
  const { t } = useLocale();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Magnifyer Glass
        </Link>
        <nav className="text-muted-foreground flex items-center gap-4 text-sm">
          <Link href="/teams" className="hover:text-foreground transition-colors">
            {t("nav.teams")}
          </Link>
          <Link href="/players" className="hover:text-foreground transition-colors">
            {t("nav.players")}
          </Link>
          <Link href="/drafts" className="hover:text-foreground transition-colors">
            {t("nav.drafts")}
          </Link>
          <Link href="/years" className="hover:text-foreground transition-colors">
            {t("nav.years")}
          </Link>
          <Link href="/lists" className="hover:text-foreground transition-colors">
            {t("nav.lists")}
          </Link>
          <Link href="/discovery" className="hover:text-foreground transition-colors">
            {t("nav.prospects")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <KBarTrigger />
        </div>
      </div>
      <KBar />
    </header>
  );
}
