"use client";

import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { use } from "react";
import { useLeague, useScoreboard, useStandings } from "@/lib/hooks/use-fantasy-data";
import { useWindowSize } from "@/lib/hooks/use-window.size";
import type { YahooLeague, YahooMatchup, YahooTeamStandings } from "@/lib/yahoo-fantasy";

const tabs = ["standings", "scoreboard"] as const;
type Tab = (typeof tabs)[number];

export default function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = use(params);
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabs).withDefault("standings"),
  );
  const [selectedWeek, setSelectedWeek] = useQueryState("week", parseAsInteger.withDefault(0));

  const { data: league, isLoading: leagueLoading, error: leagueError } = useLeague(leagueId);
  const { data: standings, isLoading: standingsLoading } = useStandings(leagueId);

  // Set initial week when league loads (only if not already set via URL)
  if (league && selectedWeek === 0) {
    setSelectedWeek(league.current_week);
  }

  // Use the effective week for scoreboard (fallback to league's current week)
  const effectiveWeek = selectedWeek || league?.current_week;
  const { data: matchups, isFetching: scoreboardFetching } = useScoreboard(leagueId, effectiveWeek);

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

      {/* League Header */}
      {league && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center gap-6">
            {league.logo_url && (
              <picture>
                <img
                  src={league.logo_url}
                  alt={league.name}
                  className="h-20 w-20 rounded-2xl bg-zinc-800 object-cover"
                />
              </picture>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">{league.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-400">
                  {league.season} Season
                </span>
                <span>{league.num_teams} Teams</span>
                <span>•</span>
                <span>{league.scoring_type}</span>
                <span>•</span>
                <span>Week {league.current_week}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("standings")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "standings"
              ? "bg-violet-500 text-white"
              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          Standings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("scoreboard")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "scoreboard"
              ? "bg-violet-500 text-white"
              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          Scoreboard
        </button>
      </div>

      {/* Content */}
      {activeTab === "standings" ? (
        <StandingsTable standings={standings ?? []} leagueId={leagueId} />
      ) : (
        <Scoreboard
          matchups={matchups ?? []}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          league={league ?? null}
          leagueId={leagueId}
          isLoading={scoreboardFetching}
        />
      )}
    </div>
  );
}

function StandingsTable({
  standings,
  leagueId,
}: {
  standings: YahooTeamStandings[];
  leagueId: string;
}) {
  if (standings.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
        No standings data available
      </div>
    );
  }

  const { isMobile } = useWindowSize();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">League Standings</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Team</th>
              <th className="px-6 py-4 text-center">W</th>
              {!isMobile && (
                <>
                  <th className="px-6 py-4 text-center">L</th>
                  <th className="px-6 py-4 text-center">T</th>
                  <th className="px-6 py-4 text-right">Win %</th>
                  <th className="px-6 py-4 text-right">PF</th>
                  <th className="px-6 py-4 text-right">PA</th>
                  <th className="px-6 py-4 text-right">Diff</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {standings.map((standing, index) => {
              const rank = standing.team_standings?.rank || index + 1;
              const isPlayoff = rank <= 6;
              const pointsDiff =
                (standing.team_standings?.points_for || 0) -
                (standing.team_standings?.points_against || 0);

              return (
                <tr key={standing.team.team_key} className="transition-colors hover:bg-zinc-800/30">
                  <td className="px-6 py-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        rank === 1
                          ? "bg-amber-500/20 text-amber-400"
                          : rank === 2
                            ? "bg-zinc-400/20 text-zinc-300"
                            : rank === 3
                              ? "bg-orange-600/20 text-orange-400"
                              : isPlayoff
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {rank}
                    </div>
                  </td>
                  <td className="max-w-[200px] px-6 py-4 sm:max-w-[300px]">
                    <Link
                      href={`/league/${leagueId}/team/${standing.team.team_id}`}
                      className="group flex items-center gap-3"
                    >
                      {standing.team.team_logos?.[0]?.url && (
                        <picture>
                          <img
                            src={standing.team.team_logos[0].url}
                            alt={standing.team.name}
                            className="h-10 min-w-10 w-10 shrink-0 rounded-lg bg-zinc-800 object-cover"
                          />
                        </picture>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white group-hover:text-violet-400 transition-colors">
                          {standing.team.name}
                        </div>
                        {standing.team.managers?.[0]?.nickname && (
                          <div className="truncate text-xs text-zinc-500">
                            {standing.team.managers[0].nickname}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-emerald-400">
                    {standing.team_standings?.outcome_totals.wins || 0}
                  </td>
                  {!isMobile && (
                    <>
                      <td className="px-6 py-4 text-center font-semibold text-emerald-400">
                        {standing.team_standings?.outcome_totals.wins || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-red-400">
                        {standing.team_standings?.outcome_totals.losses || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-zinc-500">
                        {standing.team_standings?.outcome_totals.ties || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
                        {((standing.team_standings?.outcome_totals.percentage || 0) * 100).toFixed(
                          0,
                        )}
                        %
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-white">
                        {standing.team_standings?.points_for?.toFixed(1) || "0.0"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-zinc-400">
                        {standing.team_standings?.points_against?.toFixed(1) || "0.0"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-semibold ${
                            pointsDiff > 0
                              ? "text-emerald-400"
                              : pointsDiff < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                          }`}
                        >
                          {pointsDiff > 0 ? "+" : ""}
                          {pointsDiff.toFixed(1)}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Scoreboard({
  matchups,
  selectedWeek,
  setSelectedWeek,
  league,
  leagueId,
  isLoading,
}: {
  matchups: YahooMatchup[];
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  league: YahooLeague | null;
  leagueId: string;
  isLoading: boolean;
}) {
  if (!league || selectedWeek === 0) return null;
  const isNow = league?.season === new Date().getFullYear().toString();

  return (
    <div className="space-y-6">
      {/* Week Selector */}

      <div className="flex items-center gap-4 mx-auto">
        <div className="flex self-start gap-4">
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
            <span className={`text-2xl font-bold "text-white self-baseline`}>
              Week {selectedWeek}
            </span>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {selectedWeek === league?.current_week && isNow && (
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
              key={`${matchup.week}-${matchup.teams[0]?.team.team_key}-${matchup.teams[1]?.team.team_key}`}
              matchup={matchup}
              leagueId={leagueId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchupCard({ matchup, leagueId }: { matchup: YahooMatchup; leagueId: string }) {
  const team1 = matchup.teams[0];
  const team2 = matchup.teams[1];

  if (!team1 || !team2) return null;

  const score1 = team1.team_points?.total || 0;
  const score2 = team2.team_points?.total || 0;
  const isComplete = matchup.status === "postevent";
  const team1Wins = isComplete && score1 > score2;
  const team2Wins = isComplete && score2 > score1;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {matchup.is_playoffs && (
        <div className="border-b border-zinc-800 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-amber-400">
          Playoffs
        </div>
      )}
      <div className="p-4">
        {/* Team 1 */}
        <Link
          href={`/league/${leagueId}/team/${team1.team.team_id}?week=${matchup.week}&prev=scoreboard`}
          className={`group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-800/50 ${
            team1Wins ? "bg-emerald-500/5" : ""
          }`}
        >
          {team1.team.team_logos?.[0]?.url && (
            <picture>
              <img
                src={team1.team.team_logos[0].url}
                alt={team1.team.name}
                className="h-12 w-12 shrink-0 rounded-lg bg-zinc-800 object-cover"
              />
            </picture>
          )}
          <div className="flex-1 min-w-0">
            <div
              className={`font-semibold truncate group-hover:text-violet-400 transition-colors ${team1Wins ? "text-emerald-400" : "text-white"}`}
            >
              {team1.team.name}
            </div>
            <div className="text-xs text-zinc-500">
              {team1.team_standings?.outcome_totals.wins || 0}-
              {team1.team_standings?.outcome_totals.losses || 0}
            </div>
          </div>
          <div
            className={`shrink-0 text-2xl font-bold ${team1Wins ? "text-emerald-400" : "text-white"}`}
          >
            {score1.toFixed(1)}
          </div>
          {team1Wins && (
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
          href={`/league/${leagueId}/team/${team2.team.team_id}?week=${matchup.week}&prev=scoreboard`}
          className={`group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-800/50 ${
            team2Wins ? "bg-emerald-500/5" : ""
          }`}
        >
          {team2.team.team_logos?.[0]?.url && (
            <picture>
              <img
                src={team2.team.team_logos[0].url}
                alt={team2.team.name}
                className="h-12 w-12 shrink-0 rounded-lg bg-zinc-800 object-cover"
              />
            </picture>
          )}
          <div className="flex-1 min-w-0">
            <div
              className={`font-semibold truncate group-hover:text-violet-400 transition-colors ${team2Wins ? "text-emerald-400" : "text-white"}`}
            >
              {team2.team.name}
            </div>
            <div className="text-xs text-zinc-500">
              {team2.team_standings?.outcome_totals.wins || 0}-
              {team2.team_standings?.outcome_totals.losses || 0}
            </div>
          </div>
          <div
            className={`shrink-0 text-2xl font-bold ${team2Wins ? "text-emerald-400" : "text-white"}`}
          >
            {score2.toFixed(1)}
          </div>
          {team2Wins && (
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
