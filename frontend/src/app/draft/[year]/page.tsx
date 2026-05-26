import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftClassGrid } from "@/components/draft-class-grid";
import { PageShell, PageHeader, SectionCard } from "@/components/section-card";
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
    <PageShell>
      <PageHeader
        kicker={t("common.draft")}
        title={`${year} NBA Draft`}
        subtitle={`${t("draft.picks_count", { n: drafted.length })}${
          undrafted_count > 0 ? ` · ${t("draft.undrafted_in_db", { n: undrafted_count })}` : ""
        }`}
      >
        <Link
          href={`/draft/${yr - 1}`}
          className="hover:bg-accent rounded-full border border-border px-3 py-1.5 text-sm transition-colors"
        >
          ← {yr - 1}
        </Link>
        <Link
          href="/drafts"
          className="hover:bg-accent rounded-full border border-border px-3 py-1.5 text-sm transition-colors"
        >
          {t("draft.all_drafts")}
        </Link>
        <Link
          href={`/draft/${yr + 1}`}
          className="hover:bg-accent rounded-full border border-border px-3 py-1.5 text-sm transition-colors"
        >
          {yr + 1} →
        </Link>
      </PageHeader>

      <SectionCard>
        <DraftClassGrid picks={drafted} />
      </SectionCard>
    </PageShell>
  );
}

