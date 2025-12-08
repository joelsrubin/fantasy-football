import Link from "next/link";
import type { League } from "@/db/schema";
import type { MatchupEntry } from "@/lib/hooks/use-fantasy-data";

export function MatchupCard({
  matchup,
  leagueId,
  winLossRecords,
  isCurrentWeek,
  league,
}: {
  matchup: MatchupEntry;
  leagueId: string;
  winLossRecords: { team: string; wins: number; losses: number }[] | undefined;
  isCurrentWeek: boolean;
  league: League | null;
}) {
  const isNow = league?.season === new Date().getFullYear().toString();

  const team1 = matchup.teams[0];
  const team2 = matchup.teams[1];
  if (!team1 || !team2) return null;

  const team1WinLoss = winLossRecords?.find((record) => record.team === team1.name);
  const team2WinLoss = winLossRecords?.find((record) => record.team === team2.name);

  const score1 = team1.points || 0;
  const score2 = team2.points || 0;
  const team1Wins = team1.isWinner;
  const team2Wins = team2.isWinner;

  const shouldShowCheck = !isNow || (isNow && !isCurrentWeek);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {matchup.isPlayoff && (
        <div className="border-b border-zinc-800 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-amber-400">
          Playoffs
        </div>
      )}
      <div className="p-4">
        {/* Team 1 */}
        <Link
          href={`/league/${leagueId}/team/${team1.teamId}?week=${matchup.week}&prev=scoreboard`}
          className={`group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-800/50 ${
            team1Wins && shouldShowCheck ? "bg-emerald-500/5" : ""
          }`}
        >
          {team1.logoUrl && (
            <picture>
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="h-12 w-12 shrink-0 rounded-lg bg-zinc-800 object-cover"
              />
            </picture>
          )}
          <div className="flex-1 min-w-0">
            <div
              className={`font-semibold truncate group-hover:text-violet-400 transition-colors ${team1Wins && shouldShowCheck ? "text-emerald-400" : "text-white"}`}
            >
              {team1.name}
            </div>
            <div className="text-xs text-zinc-500">
              {team1WinLoss?.wins || 0}-{team1WinLoss?.losses || 0}
            </div>
          </div>
          <div
            className={`shrink-0 text-2xl font-bold ${team1Wins && shouldShowCheck ? "text-emerald-400" : "text-white"}`}
          >
            {score1.toFixed(1)}
          </div>
          {shouldShowCheck && team1Wins && (
            <div className="rounded-full bg-emerald-500/20 p-1">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </Link>

        {/* Divider */}
        <div className="my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs font-medium text-zinc-600">VS</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Team 2 */}
        <Link
          href={`/league/${leagueId}/team/${team2.teamId}?week=${matchup.week}&prev=scoreboard`}
          className={`group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-800/50 ${
            team2Wins && shouldShowCheck ? "bg-emerald-500/5" : ""
          }`}
        >
          {team2.logoUrl && (
            <picture>
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="h-12 w-12 shrink-0 rounded-lg bg-zinc-800 object-cover"
              />
            </picture>
          )}
          <div className="flex-1 min-w-0">
            <div
              className={`font-semibold truncate group-hover:text-violet-400 transition-colors ${team2Wins && shouldShowCheck ? "text-emerald-400" : "text-white"}`}
            >
              {team2.name}
            </div>
            <div className="text-xs text-zinc-500">
              {team2WinLoss?.wins || 0}-{team2WinLoss?.losses || 0}
            </div>
          </div>
          <div
            className={`shrink-0 text-2xl font-bold ${team2Wins && shouldShowCheck ? "text-emerald-400" : "text-white"}`}
          >
            {score2.toFixed(1)}
          </div>
          {shouldShowCheck && team2Wins && (
            <div className="rounded-full bg-emerald-500/20 p-1">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
