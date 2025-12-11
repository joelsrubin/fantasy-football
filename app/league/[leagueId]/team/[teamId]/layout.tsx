import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Roster | BBSFFL",
  description:
    "View weekly roster, starting lineup, bench players, and point totals for your fantasy football team.",
  openGraph: {
    title: "Team Roster | BBSFFL",
    description:
      "View weekly roster, starting lineup, bench players, and point totals for your fantasy football team.",
    type: "website",
    images: ["/og-icon.png"],
  },
  twitter: {
    card: "summary",
    title: "Team Roster | BBSFFL",
    description:
      "View weekly roster, starting lineup, bench players, and point totals for your fantasy football team.",
    images: ["/og-icon.png"],
  },
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
