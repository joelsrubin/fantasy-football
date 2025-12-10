import type { League } from "@/db/schema";
import type { MatchupEntry } from "@/lib/hooks/use-fantasy-data";
import { MatchupCard } from "./matchup-card";

export function Scoreboard({
  matchups,
  selectedWeek,
  setSelectedWeek,
  league,
  leagueId,
  isLoading,
  winLossRecords,
}: {
  matchups: MatchupEntry[];
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  league: League | null;
  leagueId: string;
  isLoading: boolean;
  winLossRecords: { team: string; wins: number; losses: number }[] | undefined;
}) {
  if (!league || selectedWeek === 0) return null;
  const isNow = league?.season === new Date().getFullYear().toString();
  const isCurrentWeek = selectedWeek === league?.currentWeek;
  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center gap-4 mx-auto">
        <div className="flex self-start gap-4">
          <button
            type="button"
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek <= 1}
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
            // disabled={isCurrentWeek && isNow}
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {selectedWeek === league?.currentWeek && isNow && (
          <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            Current
          </span>
        )}
      </div>
      {/* Matchups Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <span className="text-sm text-zinc-400">Loading matchups...</span>
          </div>
        </div>
      ) : matchups.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
          No matchups available for this week
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matchups.map((matchup) => (
            <MatchupCard
              key={`${matchup.week}-${matchup.teams[0]?.teamKey}-${matchup.teams[1]?.teamKey}`}
              matchup={matchup}
              leagueId={leagueId}
              winLossRecords={winLossRecords}
              isCurrentWeek={isCurrentWeek}
              league={league}
            />
          ))}
        </div>
      )}
    </div>
  );
}
