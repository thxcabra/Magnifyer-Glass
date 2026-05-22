import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftClassGrid } from "@/components/draft-class-grid";
import { api } from "@/lib/api";
import { getServerT } from "@/lib/locale-server";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} NBA Draft class`,
    description: `${year} NBA Draft — every pick, classified by tactical archetype and linked to a full player profile with stats, body composition, and NBA comparisons.`,
    alternates: { canonical: `/draft/${year}` },
  };
}

export default async function DraftYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const { t } = await getServerT();
  const yr = Number(year);
  if (!yr || yr < 1947 || yr > 2030) notFound();

  let data;
  try {
    data = await api.getDraftClass(yr, { next: { revalidate: 3600 } });
  } catch {
    notFound();
  }

  const { drafted, undrafted_count } = data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{t("common.draft")}</p>
      <h1 className="mt-1 flex items-baseline gap-3 text-4xl font-semibold tracking-tight">
        {/* "{year} NBA Draft" kept verbatim - the year is universal and "NBA Draft"
            is the term Brazilian fans already use. */}
        {year} NBA Draft
        <span className="text-muted-foreground text-base font-normal">
          {t("draft.picks_count", { n: drafted.length })}
          {undrafted_count > 0 && ` · ${t("draft.undrafted_in_db", { n: undrafted_count })}`}
        </span>
      </h1>

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/draft/${yr - 1}`}
          className="text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm transition-colors"
        >
          ← {yr - 1}
        </Link>
        <Link
          href="/drafts"
          className="text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm transition-colors"
        >
          {t("draft.all_drafts")}
        </Link>
        <Link
          href={`/draft/${yr + 1}`}
          className="text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm transition-colors"
        >
          {yr + 1} →
        </Link>
      </div>

      <DraftClassGrid picks={drafted} />
    </div>
  );
}

