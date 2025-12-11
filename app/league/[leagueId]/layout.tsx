import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "League Details | BBSFFL",
  description:
    "View league standings, weekly matchups, and historical stats for your fantasy football league.",
};

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
