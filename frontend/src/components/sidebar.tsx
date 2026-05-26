"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  Calendar,
  History,
  House,
  ListOrdered,
  Menu,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { KBar, KBarTrigger } from "./k-bar";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { useLocale } from "./locale-provider";
import type { Theme } from "@/lib/theme";

type NavItem = { href: string; key: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> };

// Two groups, mirroring the brand mockup: the everyday fan destinations first,
// the historical / differentiator sections below a divider.
const PRIMARY: NavItem[] = [
  { href: "/", key: "nav.home", Icon: House },
  { href: "/jogos", key: "nav.games", Icon: Activity },
  { href: "/classificacao", key: "nav.standings", Icon: ListOrdered },
  { href: "/teams", key: "nav.teams", Icon: Shield },
  { href: "/players", key: "nav.players", Icon: Users },
];

const SECONDARY: NavItem[] = [
  { href: "/calendario", key: "nav.schedule", Icon: Calendar },
  { href: "/playoffs", key: "nav.playoffs", Icon: Trophy },
  { href: "/drafts", key: "nav.drafts", Icon: Sparkles },
  { href: "/years", key: "nav.years", Icon: History },
  { href: "/lists", key: "nav.lists", Icon: Award },
];

function MagnifyerMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="13.5" cy="10.5" r="7" />
      <line x1="8.55" y1="15.45" x2="2.8" y2="21.2" />
      <path d="M9.9 8.2 A4 4 0 0 1 12.2 6.5" />
    </svg>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** A single nav pill. Active = solid orange (the one interactive accent). */
function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
      }
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      <span>{t(item.key)}</span>
    </Link>
  );
}

function LogoCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-2xl bg-[#fff4ea] px-3.5 py-3 text-[#262422] transition-transform hover:scale-[1.01]"
    >
      <MagnifyerMark className="size-6 text-[#e36c04]" />
      <span className="font-heading text-base font-bold tracking-tight leading-none">
        Magnifyer&nbsp;Glass
      </span>
    </Link>
  );
}

/**
 * Persistent left rail (lg+). Holds the logo card, the vertical nav, the ⌘K
 * trigger and the language pill. Below lg it collapses into a compact top bar
 * with a slide-down drawer; the ⌘K palette itself is mounted here once.
 */
export function Sidebar({ theme }: { theme: Theme }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Desktop rail */}
      <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-3 p-3 lg:flex">
        <LogoCard />
        <KBarTrigger />
        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label={t("common.menu")}>
          {PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
          ))}
          <div className="bg-sidebar-border/70 my-2 h-px" />
          {SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
          ))}
        </nav>
        <div className="flex items-center justify-between">
          <LocaleSwitcher />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="bg-sidebar text-sidebar-foreground sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 lg:hidden">
        <LogoCard onNavigate={closeMobile} />
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle initial={theme} />
          <LocaleSwitcher />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="hover:bg-sidebar-accent inline-flex size-9 items-center justify-center rounded-full border border-sidebar-border transition-colors"
            aria-label={mobileOpen ? t("common.close") : t("common.menu")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="bg-sidebar text-sidebar-foreground space-y-1 border-t border-sidebar-border px-3 py-3 lg:hidden"
          aria-label={t("common.menu")}
        >
          {[...PRIMARY, ...SECONDARY].map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              onNavigate={closeMobile}
            />
          ))}
        </nav>
      )}

      <KBar />
    </>
  );
}
