"use client";

import { LOCALES, type Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

const LABEL: Record<Locale, string> = {
  "en": "EN",
  "pt-BR": "PT",
};

const FULL_NAME: Record<Locale, string> = {
  "en": "English",
  "pt-BR": "Português (Brasil)",
};

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-full border border-sidebar-border bg-card p-0.5 text-xs"
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => !active && setLocale(l)}
            aria-pressed={active}
            title={FULL_NAME[l]}
            className={
              "rounded-full px-3 py-1 font-medium transition-colors " +
              (active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {LABEL[l]}
          </button>
        );
      })}
    </div>
  );
}
