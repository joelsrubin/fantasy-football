import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "League Details | BBSFFL",
  description:
    "View league standings, weekly matchups, and historical stats for your fantasy football league.",
  openGraph: {
    title: "League Details | BBSFFL",
    description:
      "View league standings, weekly matchups, and historical stats for your fantasy football league.",
    type: "website",
    images: ["/og-icon.png"],
  },
  twitter: {
    card: "summary",
    title: "League Details | BBSFFL",
    description:
      "View league standings, weekly matchups, and historical stats for your fantasy football league.",
    images: ["/og-icon.png"],
  },
};

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
