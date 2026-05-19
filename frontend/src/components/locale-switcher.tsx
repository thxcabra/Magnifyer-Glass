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
      className="inline-flex items-center rounded-md border bg-card text-xs"
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
              "rounded px-2 py-1 font-medium transition-colors " +
              (active
                ? "bg-foreground text-background"
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
