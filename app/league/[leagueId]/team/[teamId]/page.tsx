"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useLeague, useTeamRoster } from "@/lib/hooks/use-fantasy-data";
import type { YahooRosterPlayer } from "@/lib/yahoo-fantasy";

const positionColors: Record<string, string> = {
  QB: "bg-red-500/20 text-red-400 border-red-500/30",
  RB: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  WR: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  TE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DEF: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  FLEX: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  W_R_T: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  BN: "bg-zinc-600/20 text-zinc-500 border-zinc-600/30",
  IR: "bg-zinc-700/20 text-zinc-600 border-zinc-700/30",
};

export default function TeamPage({
  params,
}: {
  params: Promise<{ leagueId: string; teamId: string }>;
}) {
  const { leagueId, teamId } = use(params);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const { data: league } = useLeague(leagueId);
  const {
    data: roster,
    isLoading,
    error,
  } = useTeamRoster(leagueId, teamId, selectedWeek ?? undefined);

  // Set initial week when league loads
  useEffect(() => {
    if (league && selectedWeek === null) {
      setSelectedWeek(league.current_week);
    }
  }, [league, selectedWeek]);

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

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Back Button */}
      <Link
        href={`/league/${leagueId}`}
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
        Back to League
      </Link>

      {/* Week Selector & Points */}
      {league && selectedWeek && (
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
              {selectedWeek === league.current_week && (
                <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Current
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedWeek(Math.min(parseInt(league.end_week, 10), selectedWeek + 1))
              }
              disabled={selectedWeek === parseInt(league.end_week, 10)}
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
            <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Starting Lineup</h2>
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

function PlayerRow({ player }: { player: YahooRosterPlayer }) {
  const position = player.selected_position?.position || player.display_position;
  const displayPosition = position === "W_R_T" ? "FLEX" : position;
  const positionClass = positionColors[position] || positionColors.BN;

  return (
    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-800/30">
      {/* Position Badge */}
      <div
        className={`flex h-10 w-14 items-center justify-center rounded-lg border font-bold text-xs ${positionClass}`}
      >
        {displayPosition}
      </div>

      {/* Player Info */}
      <div className="flex flex-1 items-center gap-4">
        {player.headshot?.url && (
          <picture>
            <img
              src={player.headshot.url}
              alt={player.name.full}
              className="h-10 w-10 rounded-full bg-zinc-800 object-cover"
            />
          </picture>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white truncate">{player.name.full}</span>
            {player.status && (
              <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-400">
                {player.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>{player.editorial_team_abbr}</span>
            <span>•</span>
            <span>{player.display_position}</span>
            {player.bye_weeks?.week && (
              <>
                <span>•</span>
                <span className="text-zinc-600">BYE: Week {player.bye_weeks.week}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <div className="text-xl font-bold text-white">
          {player.player_points?.total?.toFixed(2) || "0.00"}
        </div>
        <div className="text-xs text-zinc-500">pts</div>
      </div>
    </div>
  );
}
