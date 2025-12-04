"use client";

import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  type LeagueInfo,
  type RankingEntry,
  useMyLeagues,
  useRankings,
} from "@/lib/hooks/use-fantasy-data";

const tabs = ["leagues", "rankings"] as const;
type Tab = (typeof tabs)[number];

export default function Home() {
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
      <div className="mb-8 flex justify-center gap-2">
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
      </div>

      {/* Content */}
      {activeTab === "leagues" ? <LeaguesTab /> : <RankingsTab />}
    </div>
  );
}

function LeaguesTab() {
  const { data: seasons, isLoading, error } = useMyLeagues();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <span className="text-zinc-400">Loading your leagues...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-6">
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
          <h2 className="mb-2 text-xl font-semibold text-white">Error Loading Leagues</h2>
          <p className="mb-6 text-zinc-400">{error.message}</p>
          <p className="text-sm text-zinc-500">
            Make sure you&apos;ve run{" "}
            <code className="rounded bg-zinc-800 px-2 py-1">pnpm run setup-yahoo</code>
          </p>
        </div>
      </div>
    );
  }

  if (!seasons || seasons.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-6">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">No Leagues Found</h2>
          <p className="text-zinc-400">No NFL fantasy leagues found for your account.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Summary */}
      <div className="mb-8 text-center">
        <p className="text-zinc-400">
          {seasons.length} seasons • {seasons.reduce((acc, s) => acc + s.leagues.length, 0)} leagues
        </p>
      </div>

      {/* Seasons */}
      <div className="space-y-10">
        {seasons.map((season) => (
          <div key={season.season}>
            {/* Season Header */}
            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">{season.season}</h2>
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-400">
                {season.leagues.length} league{season.leagues.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* League Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {season.leagues.map((league) => (
                <LeagueCard key={league.leagueKey} league={league} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RankingsTab() {
  const { data: rankings, isLoading, error } = useRankings();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <span className="text-zinc-400">Loading rankings...</span>
        </div>
      </div>
    );
  }

  if (error || !rankings || rankings.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-6">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-500"
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
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">No Rankings Available</h2>
          <p className="text-zinc-400">
            Run <code className="rounded bg-zinc-800 px-2 py-1">pnpm aggregate-stats</code> to
            generate rankings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Summary */}
      <div className="mb-8 text-center">
        <p className="text-zinc-400">{rankings.length} all-time participants</p>
      </div>

      {/* Rankings Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">All-Time Standings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 text-center">W</th>
                <th className="px-6 py-4 text-center">L</th>
                <th className="px-6 py-4 text-right">Win %</th>
                <th className="hidden px-6 py-4 text-right sm:table-cell">PF</th>
                <th className="hidden px-6 py-4 text-right md:table-cell">Diff</th>
                <th className="px-6 py-4 text-center">🏆</th>
                <th className="hidden px-6 py-4 text-center lg:table-cell">Seasons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rankings.map((entry) => (
                <RankingRow key={entry.nickname} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const isTop3 = entry.rank <= 3;

  return (
    <tr className="transition-colors hover:bg-zinc-800/30">
      <td className="px-6 py-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            entry.rank === 1
              ? "bg-amber-500/20 text-amber-400"
              : entry.rank === 2
                ? "bg-zinc-400/20 text-zinc-300"
                : entry.rank === 3
                  ? "bg-orange-600/20 text-orange-400"
                  : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {entry.rank}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="min-w-0">
          <div className={`truncate font-semibold ${isTop3 ? "text-white" : "text-zinc-300"}`}>
            {entry.name}
          </div>
          {entry.name !== entry.nickname && (
            <div className="truncate text-xs text-zinc-500">{entry.nickname}</div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center font-semibold text-emerald-400">{entry.wins}</td>
      <td className="px-6 py-4 text-center font-semibold text-red-400">{entry.losses}</td>
      <td className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
        {entry.winPct.toFixed(1)}%
      </td>
      <td className="hidden px-6 py-4 text-right font-semibold text-white sm:table-cell">
        {entry.pointsFor.toFixed(0)}
      </td>
      <td className="hidden px-6 py-4 text-right md:table-cell">
        <span
          className={`font-semibold ${
            entry.pointDiff > 0
              ? "text-emerald-400"
              : entry.pointDiff < 0
                ? "text-red-400"
                : "text-zinc-500"
          }`}
        >
          {entry.pointDiff > 0 ? "+" : ""}
          {entry.pointDiff.toFixed(0)}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        {entry.championships > 0 ? (
          <span className="font-bold text-amber-400">{entry.championships}</span>
        ) : (
          <span className="text-zinc-600">-</span>
        )}
      </td>
      <td className="hidden px-6 py-4 text-center text-zinc-400 lg:table-cell">
        {entry.seasonsPlayed}
      </td>
    </tr>
  );
}

function LeagueCard({ league }: { league: LeagueInfo }) {
  const isCurrent = league.season === "2025";

  return (
    <Link
      href={`/league/${league.leagueKey}`}
      className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-violet-500/50 hover:bg-zinc-900"
    >
      {/* Current Season Badge */}
      {isCurrent && (
        <div className="absolute right-4 top-14">
          <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-400">
            Current
          </span>
        </div>
      )}

      {/* League Info */}
      <div className="mb-4 flex items-start gap-4">
        {league.logoUrl ? (
          <picture>
            <img
              src={league.logoUrl}
              alt={league.name}
              className="h-14 w-14 rounded-xl bg-zinc-800 object-cover"
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
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
            {league.name}
          </h3>
          <p className="text-sm text-zinc-500">{league.numTeams} teams</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
        <div className="text-sm">
          <span className="text-zinc-500">Week </span>
          <span className="font-semibold text-white">{league.currentWeek}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-zinc-500 group-hover:text-violet-400 transition-colors">
          View League
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
