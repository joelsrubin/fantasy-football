import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { type RankingEntry, useRankings } from "@/lib/hooks/use-fantasy-data";

export function RankingsTab() {
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
          <span className="font-mono text-sm text-zinc-300">
            {(getValue<number>() * 100).toFixed(2)}%
          </span>
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
                          header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-zinc-300"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <SortAscIcon />,
                            desc: <SortDescIcon />,
                          }[header.column.getIsSorted() as string] ??
                            (header.column.getCanSort() ? <SortIcon /> : null)}
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
    <svg
      aria-hidden="true"
      className="h-3 w-3 text-zinc-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
      />
    </svg>
  );
}

function SortAscIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3 text-violet-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function SortDescIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3 text-violet-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
