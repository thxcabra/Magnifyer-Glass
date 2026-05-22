"use client";

import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { useLocale } from "@/components/locale-provider";

/**
 * Light/dark toggle. The server renders with the right theme (cookie-driven),
 * so this just flips the cookie and refreshes — no flash, no hydration drift.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const router = useRouter();
  const { t } = useLocale();
  const next: Theme = initial === "dark" ? "light" : "dark";

  const toggle = () => {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("theme.toggle")}
      title={t("theme.toggle")}
      className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md border transition-colors"
    >
      {initial === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
