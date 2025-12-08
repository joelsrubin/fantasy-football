"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";

import { LeaguesTab } from "./_components/leages-tab";
import { RankingsTab } from "./_components/rankings-tab";
import { StatsTab } from "./_components/stats-tab";

const tabs = ["leagues", "rankings", "stats"] as const;

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
    parseAsStringLiteral(tabs).withDefault("leagues"),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-3 text-4xl font-bold text-white">Bodega Bottle Service</h1>
        <p className="text-lg text-zinc-400">Fantasy Football Headquarters</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("leagues")}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
            activeTab === "leagues"
              ? "bg-violet-500 text-white"
              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Leagues
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rankings")}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
            activeTab === "rankings"
              ? "bg-violet-500 text-white"
              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            All-Time Rankings
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("stats")}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
            activeTab === "stats"
              ? "bg-violet-500 text-white"
              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Fun Facts
          </span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "leagues" && <LeaguesTab />}
      {activeTab === "rankings" && <RankingsTab />}
      {activeTab === "stats" && <StatsTab />}
    </div>
  );
}
