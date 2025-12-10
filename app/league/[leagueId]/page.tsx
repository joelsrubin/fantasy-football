"use client";

import { ArrowLeft, HeartHandshake, LineChart, Trophy } from "lucide-react";
import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { use, useEffect } from "react";
import { BumpChart } from "@/app/_components/bump-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeague, useScoreboard, useStandings } from "@/lib/hooks/use-fantasy-data";
import { Scoreboard } from "./_components/scoreboard";
import { StandingsTable } from "./_components/standings-table";

const tabs = [
  { label: "standings", Icon: Trophy },
  { label: "matchups", Icon: HeartHandshake },
  { label: "stats", Icon: LineChart },
] as const;

export default function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = use(params);
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabs.map((t) => t.label)).withDefault("standings"),
  );
  const [selectedWeek, setSelectedWeek] = useQueryState("week", parseAsInteger.withDefault(0));

  const { data: league, isLoading: leagueLoading, error: leagueError } = useLeague(leagueId);
  const { data: standings, isLoading: standingsLoading } = useStandings(leagueId);

  const winLossRecords = standings?.map((standing) => ({
    team: standing.name,
    wins: standing.standings?.wins || 0,
    losses: standing.standings?.losses || 0,
  }));

  // Set initial week when league loads (only if not already set via URL)
  useEffect(() => {
    if (league && selectedWeek === 0) {
      setSelectedWeek(league.currentWeek);
    }
  }, [league, selectedWeek, setSelectedWeek]);

  // Use the effective week for scoreboard (fallback to league's current week)
  const effectiveWeek = selectedWeek || league?.currentWeek;

  // Only fetch scoreboard when we have a valid week
  const { data: matchups, isFetching: scoreboardFetching } = useScoreboard(
    leagueId,
    effectiveWeek && effectiveWeek > 0 ? effectiveWeek : undefined,
  );
  if (leagueLoading || standingsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <span className="text-zinc-400">Loading league data...</span>
        </div>
      </div>
    );
  }

  if (leagueError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">Error Loading League</h2>
          <p className="mb-6 text-zinc-400">{leagueError.message}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft />
        Back to Home
      </Link>

      {/* League Header */}
      {league && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center gap-6">
            {league.logoUrl && league.logoUrl !== "0" ? (
              <picture>
                <img
                  src={league.logoUrl}
                  alt={league.name}
                  className="h-20 w-20 rounded-2xl bg-zinc-800 object-cover"
                />
              </picture>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                <svg
                  className="h-7 w-7 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">{league.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-400">
                  {league.season} Season
                </span>
                <span>Week {league.currentWeek}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* Content */}
        <TabsContent value="standings">
          <StandingsTable standings={standings ?? []} leagueId={leagueId} />
        </TabsContent>
        <TabsContent value="matchups">
          <Scoreboard
            matchups={matchups ?? []}
            selectedWeek={effectiveWeek ?? 1}
            setSelectedWeek={setSelectedWeek}
            league={league ?? null}
            leagueId={leagueId}
            isLoading={scoreboardFetching}
            winLossRecords={winLossRecords}
          />
        </TabsContent>
        <TabsContent value="stats">
          <BumpChart leagueId={league?.leagueKey || leagueId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
