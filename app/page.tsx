"use client";

import { ContactRound, type LucideProps, Sparkles, Trophy, UsersRound } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { type ForwardRefExoticComponent, type RefAttributes, Suspense } from "react";
import { useWindowSize } from "@/lib/hooks/use-window.size";
import { LeaguesTab } from "./_components/leages-tab";
import { ManagersTab } from "./_components/managers-tab";
import { RankingsTab } from "./_components/rankings-tab";
import { StatsTab } from "./_components/stats-tab";

const tabs = [
  { label: "leagues", icon: ContactRound },
  { label: "rankings", icon: Trophy },
  { label: "stats", icon: Sparkles },
  { label: "managers", icon: UsersRound },
] as const;

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <span className="text-zinc-400">Loading...</span>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(Object.keys(tabs)).withDefault("leagues"),
  );
  const capitalizedLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 text-xl font-bold text-white text-center">{capitalizedLabel}</div>

      {/* Tabs */}
      <div className="mb-8 flex justify-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <TabButton
            label={tab.label}
            onClick={() => setActiveTab(tab.label)}
            key={tab.label}
            isActive={activeTab === tab.label}
            Icon={tab.icon}
          />
        ))}
      </div>

      {/* Content */}
      {activeTab === "leagues" && <LeaguesTab />}
      {activeTab === "rankings" && <RankingsTab />}
      {activeTab === "stats" && <StatsTab />}
      {activeTab === "managers" && <ManagersTab />}
    </div>
  );
}

function TabButton({
  isActive,
  onClick,
  label,
  Icon,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  Icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
}) {
  const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
  const { isMobile } = useWindowSize();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 sm:px-4 py-2.5 text-xs font-medium transition-all ${
        isActive
          ? "bg-violet-500 text-white"
          : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon size={isMobile ? 14 : 22} />
        {capitalizedLabel}
      </span>
    </button>
  );
}
