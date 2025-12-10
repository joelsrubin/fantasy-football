"use client";

import { ContactRound, Sparkles, UsersRound } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LeaguesTab } from "./_components/leages-tab";
import { ManagersTab } from "./_components/managers-tab";
import { RankingsTab } from "./_components/rankings-tab";

const tabs = [
  { label: "leagues", Icon: ContactRound },
  { label: "stats", Icon: Sparkles },
  { label: "managers", Icon: UsersRound },
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
    parseAsStringLiteral(tabs.map((tab) => tab.label)).withDefault("leagues"),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}

      {/* Tabs */}
      <Tabs defaultValue={activeTab} className="gap-8">
        <TabsList className="mx-auto bg-slate-200/5 ">
          {tabs.map(({ label, Icon }) => (
            <TabsTrigger
              value={label}
              key={label}
              className="dark:data-[state=active]:border-violet-400 p-4"
              onClick={() => {
                setActiveTab(label);
              }}
            >
              <Icon />
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="leagues">
          <LeaguesTab />
        </TabsContent>
        <TabsContent value="stats">
          <RankingsTab />
        </TabsContent>

        <TabsContent value="managers">
          <ManagersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
