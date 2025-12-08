"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { use } from "react";
import { useLeague, useTeamRoster } from "@/lib/hooks/use-fantasy-data";
import { PlayerRow } from "./_components/player-row";

export default function TeamPage({
  params,
}: {
  params: Promise<{ leagueId: string; teamId: string }>;
}) {
  const { leagueId, teamId } = use(params);
  const searchParams = useSearchParams();
  const { data: league, isLoading: leagueLoading } = useLeague(leagueId);
  const isNow = league?.season === new Date().getFullYear().toString();

  // Use nuqs for URL-synced week state, defaulting to league's current week
  const [selectedWeek, setSelectedWeek] = useQueryState(
    "week",
    parseAsInteger.withDefault(league?.currentWeek ?? 1),
  );

  // Only fetch roster once we have league data (so we know the default week)
  const {
    data: roster,
    isLoading: rosterLoading,
    error,
  } = useTeamRoster(leagueId, teamId, league ? selectedWeek : undefined);

  const isLoading = leagueLoading || rosterLoading;

  if (error) {
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
          <h2 className="mb-2 text-xl font-semibold text-white">Error Loading Team</h2>
          <p className="mb-6 text-zinc-400">{error.message}</p>
          <Link
            href={`/league/${leagueId}`}
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
            Back to League
          </Link>
        </div>
      </div>
    );
  }

  // Group players by position type
  const starters = (roster ?? []).filter(
    (p) => p.selected_position?.position && !["BN", "IR"].includes(p.selected_position.position),
  );
  const bench = (roster ?? []).filter((p) => p.selected_position?.position === "BN");
  const ir = (roster ?? []).filter((p) => p.selected_position?.position === "IR");

  const totalPoints = starters.reduce((sum, p) => sum + (p.player_points?.total || 0), 0);

  const prev = searchParams.get("prev");
  const week = searchParams.get("week");
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Back Button */}
      <Link
        href={
          prev === "scoreboard"
            ? `/league/${leagueId}?tab=scoreboard&week=${week}`
            : `/league/${leagueId}`
        }
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
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
        {prev === "scoreboard" ? "Back to Scoreboard" : "Back to League"}
      </Link>

      {/* Week Selector & Points */}
      {league && (
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
              disabled={selectedWeek === 1}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="text-center">
              <span className="text-2xl font-bold text-white">Week {selectedWeek}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedWeek(Math.min(league.endWeek ?? 17, selectedWeek + 1))}
              disabled={selectedWeek === league.endWeek}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div className="text-right">
            <div className="text-sm text-zinc-500">Total Points</div>
            <div className="text-4xl font-bold text-white">{totalPoints.toFixed(2)}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <span className="text-zinc-400">Loading roster...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Starters */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Starting Lineup</h2>
              {selectedWeek === league?.currentWeek && isNow && (
                <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Current
                </span>
              )}
            </div>
            <div className="divide-y divide-zinc-800/50">
              {starters.map((player) => (
                <PlayerRow key={player.player_key} player={player} />
              ))}
            </div>
          </div>

          {/* Bench */}
          {bench.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
                <h2 className="text-lg font-semibold text-zinc-400">Bench</h2>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {bench.map((player) => (
                  <PlayerRow key={player.player_key} player={player} />
                ))}
              </div>
            </div>
          )}

          {/* IR */}
          {ir.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
                <h2 className="text-lg font-semibold text-zinc-500">Injured Reserve</h2>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {ir.map((player) => (
                  <PlayerRow key={player.player_key} player={player} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
