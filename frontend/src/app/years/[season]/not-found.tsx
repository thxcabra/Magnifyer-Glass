import Link from "next/link";
import { getServerT } from "@/lib/locale-server";

export default async function NotFound() {
  const { t } = await getServerT();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start px-6 py-20">
      <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
        404 · {t("years.season")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {t("notfound.year_title")}
      </h1>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        {t("notfound.year_description")}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/years"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-5 text-sm font-medium"
        >
          {t("notfound.browse_years")}
        </Link>
        <Link
          href="/"
          className="hover:bg-accent inline-flex h-10 items-center rounded-md border px-5 text-sm font-medium"
        >
          {t("notfound.back_home")}
        </Link>
      </div>
    </div>
  );
}
