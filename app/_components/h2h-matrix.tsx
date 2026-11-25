"use client";

import Link from "next/link";
import { useState } from "react";
import { formatH2HRecord, type H2HRecord } from "@/lib/h2h";
import { useH2H } from "@/lib/hooks/use-fantasy-data";

function shortName(nickname: string): string {
  const first = nickname.trim().split(/\s+/)[0] ?? nickname;
  return first.length > 8 ? `${first.slice(0, 7)}…` : first;
}

function cellClass(record: H2HRecord): string {
  if (record.wins > record.losses) {
    return "bg-emerald-500/12 text-emerald-300";
  }
  if (record.wins < record.losses) {
    return "bg-rose-500/12 text-rose-300";
  }
  return "bg-zinc-800/70 text-zinc-400";
}

export function H2HMatrix() {
  const { data: matrix, isLoading, error } = useH2H();
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center text-zinc-400">
        Loading head-to-head…
      </div>
    );
  }

  if (error || !matrix || matrix.managers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Career head-to-head</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Row vs column. Includes playoffs. Scroll sideways on a small screen.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-24 bg-zinc-900 px-3 py-3 text-left font-medium text-zinc-500">
                vs
              </th>
              {matrix.managers.map((manager, col) => (
                <th
                  key={manager.guid}
                  className={`min-w-12 px-1 py-3 text-center font-medium ${
                    hover?.col === col ? "bg-violet-500/10 text-violet-200" : "text-zinc-400"
                  }`}
                >
                  <Link
                    href={`/manager/${manager.guid}`}
                    className="inline-block max-w-12 truncate hover:text-white"
                    title={manager.nickname}
                  >
                    {shortName(manager.nickname)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.managers.map((rowManager, row) => (
              <tr key={rowManager.guid}>
                <th
                  className={`sticky left-0 z-10 border-t border-zinc-800/80 bg-zinc-900 px-3 py-2 text-left font-medium ${
                    hover?.row === row ? "text-violet-200" : "text-zinc-300"
                  }`}
                >
                  <Link href={`/manager/${rowManager.guid}`} className="hover:text-white">
                    {shortName(rowManager.nickname)}
                  </Link>
                </th>
                {matrix.cells[row].map((record, col) => {
                  const colManager = matrix.managers[col];
                  const isSelf = row === col;
                  const isHot = hover?.row === row || hover?.col === col;
                  if (isSelf || !record) {
                    return (
                      <td
                        key={colManager.guid}
                        className={`border-t border-zinc-800/80 px-1 py-2 text-center text-zinc-700 ${
                          isHot ? "bg-zinc-800/40" : ""
                        }`}
                        onMouseEnter={() => setHover({ row, col })}
                        onMouseLeave={() => setHover(null)}
                      >
                        {isSelf ? "·" : "—"}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={colManager.guid}
                      title={`${rowManager.nickname} vs ${colManager.nickname}: ${formatH2HRecord(record)}`}
                      className={`border-t border-zinc-800/80 px-1 py-2 text-center font-mono tabular-nums ${cellClass(record)} ${
                        isHot ? "brightness-125" : ""
                      }`}
                      onMouseEnter={() => setHover({ row, col })}
                      onMouseLeave={() => setHover(null)}
                    >
                      {formatH2HRecord(record)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
