import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seasons",
  description:
    "Browse every NBA season — champion, MVP, Finals MVP, DPOY, All-NBA selections, draft class, conference standings, and playoff bracket.",
  alternates: { canonical: "/years" },
};

export default function YearsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
