import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NBA Drafts",
  description:
    "Every NBA Draft class from 1985 to today. Jump straight to picks, teams, and tactical archetypes for any year.",
  alternates: { canonical: "/drafts" },
};

export default function DraftsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
