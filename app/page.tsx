"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useMemo, useState } from "react";
import {
  type LeagueInfo,
  type RankingEntry,
  useMyLeagues,
  useRankings,
} from "@/lib/hooks/use-fantasy-data";

const tabs = ["leagues", "rankings"] as const;
type Tab = (typeof tabs)[number];

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
  const [sorting, setSorting] = useState<SortingState>([{ id: "winPct", desc: true }]);

  const columns = useMemo<ColumnDef<RankingEntry>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="min-w-0">
              <div className="truncate font-semibold text-zinc-300">{entry.name}</div>
              {entry.name !== entry.nickname && (
                <div className="truncate text-xs text-zinc-500">{entry.nickname}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "wins",
        header: "W",
        cell: ({ getValue }) => (
          <span className="font-semibold text-emerald-400">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "losses",
        header: "L",
        cell: ({ getValue }) => (
          <span className="font-semibold text-red-400">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "winPct",
        header: "Win %",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-zinc-300">{getValue<number>().toFixed(1)}%</span>
        ),
      },
      {
        accessorKey: "pointsFor",
        header: "PF",
        cell: ({ getValue }) => (
          <span className="font-semibold text-white">{getValue<number>().toFixed(0)}</span>
        ),
      },
      {
        accessorKey: "pointDiff",
        header: "Diff",
        cell: ({ getValue }) => {
          const diff = getValue<number>();
          return (
            <span
              className={`font-semibold ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-zinc-500"}`}
            >
              {diff > 0 ? "+" : ""}
              {diff.toFixed(0)}
            </span>
          );
        },
      },
      {
        accessorKey: "championships",
        header: "🏆",
        cell: ({ getValue }) => {
          const champs = getValue<number>();
          return champs > 0 ? (
            <span className="font-bold text-amber-400">{champs}</span>
          ) : (
            <span className="text-zinc-600">-</span>
          );
        },
      },
      {
        accessorKey: "seasonsPlayed",
        header: "Seasons",
        cell: ({ getValue }) => <span className="text-zinc-400">{getValue<number>()}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rankings ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
          <p className="text-xs text-zinc-500 mt-1">Click column headers to sort</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500"
                >
                  {headerGroup.headers.map((header) => {
                    const isHiddenOnMobile = ["pointsFor", "pointDiff", "seasonsPlayed"].includes(
                      header.id,
                    );
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-4 ${isHiddenOnMobile ? "hidden sm:table-cell" : ""} ${
                          header.column.getCanSort() ? "cursor-pointer select-none hover:text-zinc-300" : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <SortAscIcon />,
                            desc: <SortDescIcon />,
                          }[header.column.getIsSorted() as string] ?? (
                            header.column.getCanSort() ? <SortIcon /> : null
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {table.getRowModel().rows.map((row, index) => (
                <tr key={row.id} className="transition-colors hover:bg-zinc-800/30">
                  {row.getVisibleCells().map((cell) => {
                    const isHiddenOnMobile = ["pointsFor", "pointDiff", "seasonsPlayed"].includes(
                      cell.column.id,
                    );
                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-4 ${isHiddenOnMobile ? "hidden sm:table-cell" : ""}`}
                      >
                        {cell.column.id === "name" && (
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                index === 0
                                  ? "bg-amber-500/20 text-amber-400"
                                  : index === 1
                                    ? "bg-zinc-400/20 text-zinc-300"
                                    : index === 2
                                      ? "bg-orange-600/20 text-orange-400"
                                      : "bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {index + 1}
                            </div>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        )}
                        {cell.column.id !== "name" &&
                          flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function SortIcon() {
  return (
    <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function SortAscIcon() {
  return (
    <svg className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function SortDescIcon() {
  return (
    <svg className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
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
