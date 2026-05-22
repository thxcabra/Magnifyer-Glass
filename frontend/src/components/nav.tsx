"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { KBar, KBarTrigger } from "./k-bar";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { useLocale } from "./locale-provider";
import type { Theme } from "@/lib/theme";

const LINKS = [
  { href: "/jogos", key: "nav.games" },
  { href: "/classificacao", key: "nav.standings" },
  { href: "/playoffs", key: "nav.playoffs" },
  { href: "/calendario", key: "nav.schedule" },
  { href: "/teams", key: "nav.teams" },
  { href: "/players", key: "nav.players" },
  { href: "/drafts", key: "nav.drafts" },
  { href: "/years", key: "nav.years" },
  { href: "/lists", key: "nav.lists" },
] as const;

export function Nav({ theme }: { theme: Theme }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
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
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Magnifyer Glass</span>
        </Link>

        <nav
          className="text-muted-foreground hidden items-center gap-4 text-sm md:flex"
          aria-label={t("common.menu")}
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={
                "transition-colors " +
                (isActive(link.href)
                  ? "text-foreground"
                  : "hover:text-foreground")
              }
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle initial={theme} />
          <LocaleSwitcher />
          <KBarTrigger />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="hover:bg-accent inline-flex h-9 w-9 items-center justify-center rounded-md border md:hidden"
            aria-label={mobileOpen ? t("common.close") : t("common.menu")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Menu className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-t md:hidden"
          aria-label={t("common.menu")}
        >
          <ul className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={
                    "hover:bg-accent block rounded-md px-3 py-2.5 text-sm transition-colors " +
                    (isActive(link.href)
                      ? "text-foreground bg-accent/40"
                      : "text-muted-foreground")
                  }
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <KBar />
    </header>
  );
}
