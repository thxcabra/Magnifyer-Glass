import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Awards & honors",
  description:
    "Every NBA individual award honoree, season by season — champions, MVP, DPOY, the All-NBA and All-Defensive squads, rookie classes, and stat-title leaders.",
  alternates: { canonical: "/lists" },
};

export default function ListsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
