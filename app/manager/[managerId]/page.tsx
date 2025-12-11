import { and, eq, or } from "drizzle-orm";
import {
  ArrowLeft,
  Award,
  Calendar,
  Crown,
  Flame,
  Medal,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db/db";
import { leagues, managers, matchups, rankings, teams } from "@/db/schema";

interface ManagerStats {
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  winPct: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  pointDiff: number;
  seasonsPlayed: number;
  championships: number;
  playoffAppearances: number;
  playoffWins: number;
  playoffLosses: number;
  avgPointsPerGame: number;
  bestSeason: {
    season: string;
    wins: number;
    losses: number;
    rank: number | null;
  } | null;
  worstSeason: {
    season: string;
    wins: number;
    losses: number;
    rank: number | null;
  } | null;
}

async function getManagerStats(managerId: number): Promise<ManagerStats> {
  // Get ranking stats
  const [ranking] = await db.select().from(rankings).where(eq(rankings.managerId, managerId));

  // Get all teams with league info
  const teamsWithLeagues = await db
    .select({
      team: teams,
      league: leagues,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(eq(teams.managerId, managerId));

  // Get playoff matchups
  const teamIds = teamsWithLeagues.map((t) => t.team.id);
  let playoffWins = 0;
  let playoffLosses = 0;

  if (teamIds.length > 0) {
    const playoffMatchups = await db
      .select()
      .from(matchups)
      .where(
        and(
          eq(matchups.isPlayoff, true),
          or(
            ...teamIds.map((id) => eq(matchups.team1Id, id)),
            ...teamIds.map((id) => eq(matchups.team2Id, id)),
          ),
        ),
      );

    for (const matchup of playoffMatchups) {
      const isWinner = matchup.winnerId && teamIds.includes(matchup.winnerId);
      if (isWinner) {
        playoffWins++;
      } else if (matchup.winnerId && !matchup.isTie) {
        playoffLosses++;
      }
    }
  }

  // Find best and worst seasons
  const sortedByWins = [...teamsWithLeagues].sort((a, b) => {
    const aWinPct = a.team.wins / (a.team.wins + a.team.losses + a.team.ties || 1);
    const bWinPct = b.team.wins / (b.team.wins + b.team.losses + b.team.ties || 1);
    return bWinPct - aWinPct;
  });

  const bestSeason = sortedByWins[0]
    ? {
        season: sortedByWins[0].league.season,
        wins: sortedByWins[0].team.wins,
        losses: sortedByWins[0].team.losses,
        rank: sortedByWins[0].team.rank,
      }
    : null;

  const worstSeason = sortedByWins[sortedByWins.length - 1]
    ? {
        season: sortedByWins[sortedByWins.length - 1].league.season,
        wins: sortedByWins[sortedByWins.length - 1].team.wins,
        losses: sortedByWins[sortedByWins.length - 1].team.losses,
        rank: sortedByWins[sortedByWins.length - 1].team.rank,
      }
    : null;

  const totalGames =
    (ranking?.totalWins ?? 0) + (ranking?.totalLosses ?? 0) + (ranking?.totalTies ?? 0);

  return {
    totalWins: ranking?.totalWins ?? 0,
    totalLosses: ranking?.totalLosses ?? 0,
    totalTies: ranking?.totalTies ?? 0,
    winPct: ranking?.winPct ?? 0,
    totalPointsFor: ranking?.totalPointsFor ?? 0,
    totalPointsAgainst: ranking?.totalPointsAgainst ?? 0,
    pointDiff: ranking?.pointDiff ?? 0,
    seasonsPlayed: ranking?.seasonsPlayed ?? teamsWithLeagues.length,
    championships: ranking?.championships ?? 0,
    playoffAppearances: ranking?.playoffAppearances ?? 0,
    playoffWins,
    playoffLosses,
    avgPointsPerGame: totalGames > 0 ? (ranking?.totalPointsFor ?? 0) / totalGames : 0,
    bestSeason,
    worstSeason,
  };
}

async function getManagerTeams(managerId: number) {
  return await db
    .select({
      team: teams,
      league: leagues,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(eq(teams.managerId, managerId));
}

export default async function ManagerPage({ params }: { params: Promise<{ managerId: string }> }) {
  const awaitedParams = await params;
  const guid = awaitedParams.managerId;
  const [selectedManager] = await db.select().from(managers).where(eq(managers.guid, guid));

  if (!selectedManager) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <Users className="h-8 w-8 text-zinc-500" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">Manager Not Found</h2>
            <p className="text-zinc-400">The manager you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = await getManagerStats(selectedManager.id);
  const teamsData = await getManagerTeams(selectedManager.id);
  const NOT_FOUND_IMAGE_URL = "https://s.yimg.com/ag/images/default_user_profile_pic_64sq.jpg";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Back Button */}
      <Link
        href="/?tab=managers"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      {/* Manager Header */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-linear-to-br from-zinc-900/80 to-zinc-900/40 p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {selectedManager.imageUrl &&
          selectedManager.imageUrl !== "0" &&
          selectedManager.imageUrl !== NOT_FOUND_IMAGE_URL ? (
            <picture>
              <img
                src={selectedManager.imageUrl}
                alt={selectedManager.nickname}
                className="h-24 w-24 rounded-2xl bg-zinc-800 object-cover ring-4 ring-violet-500/20"
              />
            </picture>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 ring-4 ring-violet-500/20">
              <Users className="h-12 w-12 text-violet-600" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-white">{selectedManager.nickname}</h1>
              {stats.championships > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">
                    {stats.championships}x Champion
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-sm text-violet-400">
                <Calendar className="h-3.5 w-3.5" />
                {stats.seasonsPlayed} Seasons
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-400">
                <Target className="h-3.5 w-3.5" />
                {(stats.winPct * 100).toFixed(1)}% Win Rate
              </span>
              {stats.playoffAppearances > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-400">
                  <Award className="h-3.5 w-3.5" />
                  {stats.playoffAppearances} Playoff Appearances
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={<Trophy className="h-5 w-5 text-emerald-400" />}
          label="Total Wins"
          value={stats.totalWins}
          color="emerald"
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5 text-red-400" />}
          label="Total Losses"
          value={stats.totalLosses}
          color="red"
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-amber-400" />}
          label="Points Scored"
          value={stats.totalPointsFor.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          color="amber"
        />
        <StatCard
          icon={
            stats.pointDiff >= 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )
          }
          label="Point Diff"
          value={`${stats.pointDiff >= 0 ? "+" : ""}${stats.pointDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          color={stats.pointDiff >= 0 ? "emerald" : "red"}
        />
        <StatCard
          icon={<Crown className="h-5 w-5 text-amber-400" />}
          label="Championships"
          value={stats.championships}
          color="amber"
          highlight={stats.championships > 0}
        />
        <StatCard
          icon={<Medal className="h-5 w-5 text-blue-400" />}
          label="Playoff Wins"
          value={stats.playoffWins}
          color="blue"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          label="Avg PPG"
          value={stats.avgPointsPerGame.toFixed(1)}
          color="orange"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-violet-400" />}
          label="Win %"
          value={`${(stats.winPct * 100).toFixed(1)}%`}
          color="violet"
        />
      </div>

      {/* Detailed Stats Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Career Stats Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-violet-400" />
              Career Statistics
            </h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            <StatsRow
              label="Regular Season Record"
              value={`${stats.totalWins}-${stats.totalLosses}${stats.totalTies > 0 ? `-${stats.totalTies}` : ""}`}
            />
            <StatsRow label="Win Percentage" value={`${(stats.winPct * 100).toFixed(2)}%`} />
            <StatsRow
              label="Total Games"
              value={stats.totalWins + stats.totalLosses + stats.totalTies}
            />
            <StatsRow
              label="Points For"
              value={stats.totalPointsFor.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            />
            <StatsRow
              label="Points Against"
              value={stats.totalPointsAgainst.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}
            />
            <StatsRow
              label="Point Differential"
              value={`${stats.pointDiff >= 0 ? "+" : ""}${stats.pointDiff.toLocaleString(undefined, { maximumFractionDigits: 1 })}`}
              highlight={stats.pointDiff >= 0 ? "positive" : "negative"}
            />
            <StatsRow label="Avg Points/Game" value={stats.avgPointsPerGame.toFixed(2)} />
          </div>
        </div>

        {/* Playoff Stats Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Playoff & Championship History
            </h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            <StatsRow
              label="Championships"
              value={stats.championships}
              highlight={stats.championships > 0 ? "gold" : undefined}
            />
            <StatsRow label="Playoff Appearances" value={stats.playoffAppearances} />
            <StatsRow
              label="Playoff Record"
              value={`${stats.playoffWins}-${stats.playoffLosses}`}
            />
            <StatsRow
              label="Playoff Win %"
              value={
                stats.playoffWins + stats.playoffLosses > 0
                  ? `${((stats.playoffWins / (stats.playoffWins + stats.playoffLosses)) * 100).toFixed(1)}%`
                  : "N/A"
              }
            />
            <StatsRow
              label="Playoff Appearance Rate"
              value={
                stats.seasonsPlayed > 0
                  ? `${((stats.playoffAppearances / stats.seasonsPlayed) * 100).toFixed(0)}%`
                  : "N/A"
              }
            />
            <StatsRow
              label="Championship Rate"
              value={
                stats.seasonsPlayed > 0
                  ? `${((stats.championships / stats.seasonsPlayed) * 100).toFixed(0)}%`
                  : "N/A"
              }
            />
          </div>
        </div>
      </div>

      {/* Season History */}
      {teamsData.length > 0 && (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-400" />
              Season History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-4">Season</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Record</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Points</th>
                  <th className="px-6 py-4">Finish</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Playoffs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {teamsData
                  .sort((a, b) => Number(b.league.season) - Number(a.league.season))
                  .map(({ team, league }) => {
                    const isChampion = league.isFinished && team.rank === 1;

                    return (
                      <tr key={team.id} className="transition-colors hover:bg-zinc-800/30">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-white">{league.season}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-300">{team.name}</span>
                            {isChampion && <Trophy className="h-4 w-4 text-amber-400" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">
                            <span className="text-emerald-400">{team.wins}</span>
                            <span className="text-zinc-600">-</span>
                            <span className="text-red-400">{team.losses}</span>
                            {team.ties > 0 && (
                              <>
                                <span className="text-zinc-600">-</span>
                                <span className="text-zinc-400">{team.ties}</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className="text-zinc-400">{team.pointsFor.toFixed(1)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {team.rank && (
                            <span
                              className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                                team.rank === 1
                                  ? "bg-amber-500/20 text-amber-400"
                                  : team.rank === 2
                                    ? "bg-zinc-400/20 text-zinc-300"
                                    : team.rank === 3
                                      ? "bg-orange-600/20 text-orange-400"
                                      : "bg-zinc-600 text-white"
                              }`}
                            >
                              {team.rank}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          {team.rank && team.rank <= 6 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Medal className="h-3.5 w-3.5" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-zinc-600">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "emerald" | "red" | "amber" | "blue" | "orange" | "violet";
  highlight?: boolean;
}) {
  const bgColors = {
    emerald: "from-emerald-500/10 to-emerald-500/5",
    red: "from-red-500/10 to-red-500/5",
    amber: "from-amber-500/10 to-amber-500/5",
    blue: "from-blue-500/10 to-blue-500/5",
    orange: "from-orange-500/10 to-orange-500/5",
    violet: "from-violet-500/10 to-violet-500/5",
  };

  const borderColors = {
    emerald: "border-emerald-500/30",
    red: "border-red-500/30",
    amber: "border-amber-500/30",
    blue: "border-blue-500/30",
    orange: "border-orange-500/30",
    violet: "border-violet-500/30",
  };

  return (
    <div
      className={`rounded-xl border bg-linear-to-br p-4 ${bgColors[color]} ${highlight ? borderColors[color] : "border-zinc-800"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function StatsRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "positive" | "negative" | "gold";
}) {
  const highlightColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    gold: "text-amber-400 font-bold",
  };

  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-semibold ${highlight ? highlightColors[highlight] : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
