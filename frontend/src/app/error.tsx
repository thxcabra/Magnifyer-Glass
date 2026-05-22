"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

export default function GlobalRouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start px-6 py-20">
      <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
        500
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {t("error.title")}
      </h1>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        {t("error.description")}
      </p>
      {error.digest && (
        <p className="text-muted-foreground mt-3 font-mono text-xs">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-5 text-sm font-medium"
        >
          {t("error.retry")}
        </button>
        <Link
          href="/"
          className="hover:bg-accent inline-flex h-10 items-center rounded-md border px-5 text-sm font-medium"
        >
          {t("error.go_home")}
        </Link>
      </div>
    </div>
  );
}
