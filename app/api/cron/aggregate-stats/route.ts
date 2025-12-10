import { createClient } from "@libsql/client";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { NextResponse } from "next/server";
import * as schema from "@/db/schema";
import { getYahooAccessToken } from "@/lib/yahoo-auth";

const YAHOO_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

// This route is called by Vercel cron (weekly during NFL season)
export async function GET() {
  // Verify cron secret in production
  // const authHeader = request.headers.get("authorization");
  // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  console.log("🏈 Starting weekly stats update...");

  try {
    const accessToken = await getYahooAccessToken();
    const db = createDb();

    // Only fetch current season leagues
    const currentSeason = new Date().getFullYear().toString();
    const leagues = await getCurrentSeasonLeagues(accessToken, currentSeason);

    console.log(`Found ${leagues.length} current season leagues`);

    let teamsUpdated = 0;
    let matchupsUpdated = 0;

    for (const league of leagues) {
      console.log(`Updating: ${league.name}`);

      try {
        // Get existing league from DB
        const [existingLeague] = await db
          .select()
          .from(schema.leagues)
          .where(eq(schema.leagues.leagueKey, league.leagueKey))
          .limit(1);

        if (!existingLeague) {
          console.log(`  League not in DB, skipping (run seed-db first)`);
          continue;
        }

        const previousWeek = existingLeague.currentWeek || 1;

        // Update league info
        await db
          .update(schema.leagues)
          .set({
            currentWeek: league.currentWeek,
            isFinished: league.isFinished,
          })
          .where(eq(schema.leagues.id, existingLeague.id));

        // Fetch and update standings
        const standings = await fetchStandings(accessToken, league.leagueKey);

        // Build teamKey -> dbId map
        const teamKeyToId = new Map<string, number>();
        const existingTeams = await db
          .select()
          .from(schema.teams)
          .where(eq(schema.teams.leagueId, existingLeague.id));

        for (const team of existingTeams) {
          teamKeyToId.set(team.teamKey, team.id);
        }

        for (const team of standings) {
          await db
            .update(schema.teams)
            .set({
              wins: team.wins,
              losses: team.losses,
              ties: team.ties,
              winPct: team.winPct,
              pointsFor: team.pointsFor,
              pointsAgainst: team.pointsAgainst,
              rank: team.rank,
              playoffSeed: team.playoffSeed,
            })
            .where(eq(schema.teams.teamKey, team.teamKey));

          teamsUpdated++;

          // Store weekly ranking data for bump charts
          const [teamRecord] = await db
            .select()
            .from(schema.teams)
            .where(eq(schema.teams.teamKey, team.teamKey))
            .limit(1);

          if (teamRecord) {
            await db
              .insert(schema.weeklyRankings)
              .values({
                leagueId: existingLeague.id,
                managerId: teamRecord.managerId,
                week: league.currentWeek,
                rank: team.rank,
                wins: team.wins,
                losses: team.losses,
                ties: team.ties,
                winPct: team.winPct,
                pointsFor: team.pointsFor,
                pointsAgainst: team.pointsAgainst,
              })
              .onConflictDoUpdate({
                target: [
                  schema.weeklyRankings.leagueId,
                  schema.weeklyRankings.managerId,
                  schema.weeklyRankings.week,
                ],
                set: {
                  rank: team.rank,
                  wins: team.wins,
                  losses: team.losses,
                  ties: team.ties,
                  winPct: team.winPct,
                  pointsFor: team.pointsFor,
                  pointsAgainst: team.pointsAgainst,
                },
              });
          }
        }

        // Update matchups for all weeks up to and including current week
        const lastWeekToFetch = league.isFinished
          ? existingLeague.endWeek || 17
          : league.currentWeek;

        if (lastWeekToFetch >= previousWeek) {
          console.log(`  Updating matchups for weeks ${previousWeek}-${lastWeekToFetch}`);

          for (let week = previousWeek; week <= lastWeekToFetch; week++) {
            const matchups = await fetchMatchups(accessToken, league.leagueKey, week);

            for (const matchup of matchups) {
              const team1Id = teamKeyToId.get(matchup.team1Key);
              const team2Id = teamKeyToId.get(matchup.team2Key);
              const winnerId = matchup.winnerKey ? teamKeyToId.get(matchup.winnerKey) : null;

              if (!team1Id || !team2Id) continue;

              await db
                .insert(schema.matchups)
                .values({
                  leagueId: existingLeague.id,
                  week: matchup.week,
                  team1Id,
                  team2Id,
                  team1Points: matchup.team1Points,
                  team2Points: matchup.team2Points,
                  winnerId,
                  isPlayoff: matchup.isPlayoff,
                  isTie: matchup.isTie,
                })
                .onConflictDoUpdate({
                  target: [
                    schema.matchups.leagueId,
                    schema.matchups.week,
                    schema.matchups.team1Id,
                    schema.matchups.team2Id,
                  ],
                  set: {
                    team1Points: matchup.team1Points,
                    team2Points: matchup.team2Points,
                    winnerId,
                    isPlayoff: matchup.isPlayoff,
                    isTie: matchup.isTie,
                  },
                });

              matchupsUpdated++;
            }

            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        // Calculate weekly rankings for all weeks that have matchups
        console.log(`  Calculating weekly rankings for all weeks`);
        const allMatchups = await db
          .select({ week: schema.matchups.week })
          .from(schema.matchups)
          .where(eq(schema.matchups.leagueId, existingLeague.id))
          .groupBy(schema.matchups.week)
          .orderBy(schema.matchups.week);

        for (const { week } of allMatchups) {
          await calculateWeeklyRankings(db, existingLeague.id, week, existingTeams);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error updating ${league.name}:`, error);
      }
    }

    // Recompute all-time rankings
    console.log("📈 Recomputing all-time rankings...");
    const rankingsCount = await computeRankings(db);

    console.log(
      `✅ Updated ${teamsUpdated} teams, ${matchupsUpdated} matchups, ${rankingsCount} rankings`,
    );

    return NextResponse.json({
      success: true,
      teamsUpdated,
      matchupsUpdated,
      rankingsUpdated: rankingsCount,
      leaguesProcessed: leagues.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update stats" },
      { status: 500 },
    );
  }
}

// Database setup
function createDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_DATABASE_URL not set");

  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

// Yahoo API helpers

interface LeagueInfo {
  leagueKey: string;
  name: string;
  currentWeek: number;
  isFinished: boolean;
}

interface TeamStanding {
  teamKey: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  playoffSeed?: number;
}

interface MatchupInfo {
  week: number;
  team1Key: string;
  team2Key: string;
  team1Points: number;
  team2Points: number;
  isPlayoff: boolean;
  isTie: boolean;
  winnerKey: string | null;
}

async function yahooRequest<T>(accessToken: string, endpoint: string): Promise<T> {
  const response = await fetch(`${YAHOO_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo API Error: ${response.status}`);
  }

  return response.json();
}

async function getCurrentSeasonLeagues(accessToken: string, season: string): Promise<LeagueInfo[]> {
  const data = await yahooRequest<Record<string, unknown>>(
    accessToken,
    "/users;use_login=1/games;game_codes=nfl/leagues?format=json",
  );

  const leagues: LeagueInfo[] = [];
  const users = (data.fantasy_content as Record<string, unknown>)?.users as Record<string, unknown>;
  const user = (users?.["0"] as Record<string, unknown>)?.user as unknown[];

  if (!user) return leagues;

  const games = (user[1] as Record<string, unknown>)?.games as Record<string, unknown>;
  const gamesCount = (games?.count as number) || 0;

  for (let i = 0; i < gamesCount; i++) {
    const game = (games[i.toString()] as Record<string, unknown>)?.game as unknown[];
    if (!game) continue;

    const gameInfo = game[0] as Record<string, unknown>;

    // Only process current season
    if (gameInfo.season !== season) continue;

    const leaguesData = (game[1] as Record<string, unknown>)?.leagues as Record<string, unknown>;
    const leaguesCount = (leaguesData?.count as number) || 0;

    for (let j = 0; j < leaguesCount; j++) {
      const leagueArray = (leaguesData[j.toString()] as Record<string, unknown>)
        ?.league as unknown[];
      const league = leagueArray?.[0] as Record<string, unknown>;
      if (!league) continue;

      if (league.draft_status === "predraft") continue;

      leagues.push({
        leagueKey: league.league_key as string,
        name: league.name as string,
        currentWeek: parseInt(league.current_week as string, 10) || 1,
        isFinished: league.is_finished === "1" || league.is_finished === 1,
      });
    }
  }

  return leagues;
}

async function fetchStandings(accessToken: string, leagueKey: string): Promise<TeamStanding[]> {
  const data = await yahooRequest<Record<string, unknown>>(
    accessToken,
    `/league/${leagueKey}/standings?format=json`,
  );

  const teams: TeamStanding[] = [];

  try {
    const fantasy = data.fantasy_content as Record<string, unknown>;
    const league = fantasy?.league as unknown[];
    if (!league?.[1]) return teams;

    const standingsData = (
      (league[1] as Record<string, unknown>).standings as unknown[]
    )?.[0] as Record<string, unknown>;
    const teamsData = standingsData?.teams as Record<string, unknown>;
    const teamsCount = (teamsData?.count as number) || 0;

    for (let i = 0; i < teamsCount; i++) {
      const teamData = (teamsData?.[i.toString()] as Record<string, unknown>)?.team as unknown[];
      if (!teamData) continue;

      const teamInfo = teamData[0] as unknown[];
      const flatTeam: Record<string, unknown> = {};
      for (const item of teamInfo) {
        if (typeof item === "object" && item !== null) {
          Object.assign(flatTeam, item);
        }
      }

      const standingsInfo = (teamData[2] as Record<string, unknown>)?.team_standings as Record<
        string,
        unknown
      >;
      const outcomeTotals = standingsInfo?.outcome_totals as Record<string, string>;

      teams.push({
        teamKey: flatTeam.team_key as string,
        wins: parseInt(outcomeTotals?.wins || "0", 10),
        losses: parseInt(outcomeTotals?.losses || "0", 10),
        ties: parseInt(outcomeTotals?.ties || "0", 10),
        winPct: parseFloat(outcomeTotals?.percentage || "0"),
        pointsFor: parseFloat(standingsInfo?.points_for as string) || 0,
        pointsAgainst: parseFloat(standingsInfo?.points_against as string) || 0,
        rank: parseInt(standingsInfo?.rank as string, 10) || 0,
        playoffSeed: standingsInfo?.playoff_seed
          ? parseInt(standingsInfo.playoff_seed as string, 10)
          : undefined,
      });
    }
  } catch (error) {
    console.error(`Error parsing standings for ${leagueKey}:`, error);
  }

  return teams;
}

async function fetchMatchups(
  accessToken: string,
  leagueKey: string,
  week: number,
): Promise<MatchupInfo[]> {
  const data = await yahooRequest<Record<string, unknown>>(
    accessToken,
    `/league/${leagueKey}/scoreboard;week=${week}?format=json`,
  );

  const matchups: MatchupInfo[] = [];

  try {
    const fantasy = data.fantasy_content as Record<string, unknown>;
    const league = fantasy?.league as unknown[];
    if (!league?.[1]) return matchups;

    const scoreboard = (league[1] as Record<string, unknown>)?.scoreboard as Record<
      string,
      unknown
    >;
    const matchupsData = (scoreboard?.["0"] as Record<string, unknown>)?.matchups as Record<
      string,
      unknown
    >;
    const matchupsCount = (matchupsData?.count as number) || 0;

    for (let i = 0; i < matchupsCount; i++) {
      const matchupData = (matchupsData?.[i.toString()] as Record<string, unknown>)
        ?.matchup as Record<string, unknown>;
      if (!matchupData) continue;

      const isPlayoff = matchupData.is_playoffs === "1" || matchupData.is_playoffs === 1;

      const teamsInMatchup = (matchupData["0"] as Record<string, unknown>)?.teams as Record<
        string,
        unknown
      >;
      if (!teamsInMatchup || (teamsInMatchup.count as number) !== 2) continue;

      // Get team 1
      const team1Data = (teamsInMatchup["0"] as Record<string, unknown>)?.team as unknown[];
      const team1Info = team1Data?.[0] as unknown[];
      const team1Flat: Record<string, unknown> = {};
      for (const item of team1Info || []) {
        if (typeof item === "object" && item !== null) {
          Object.assign(team1Flat, item);
        }
      }
      const team1Points = (team1Data?.[1] as Record<string, unknown>)?.team_points as Record<
        string,
        unknown
      >;

      // Get team 2
      const team2Data = (teamsInMatchup["1"] as Record<string, unknown>)?.team as unknown[];
      const team2Info = team2Data?.[0] as unknown[];
      const team2Flat: Record<string, unknown> = {};
      for (const item of team2Info || []) {
        if (typeof item === "object" && item !== null) {
          Object.assign(team2Flat, item);
        }
      }
      const team2Points = (team2Data?.[1] as Record<string, unknown>)?.team_points as Record<
        string,
        unknown
      >;

      const t1Points = parseFloat(team1Points?.total as string) || 0;
      const t2Points = parseFloat(team2Points?.total as string) || 0;
      const isTie = t1Points === t2Points && t1Points > 0;

      let winnerKey: string | null = null;
      if (!isTie && (t1Points > 0 || t2Points > 0)) {
        winnerKey =
          t1Points > t2Points ? (team1Flat.team_key as string) : (team2Flat.team_key as string);
      }

      matchups.push({
        week,
        team1Key: team1Flat.team_key as string,
        team2Key: team2Flat.team_key as string,
        team1Points: t1Points,
        team2Points: t2Points,
        isPlayoff,
        isTie,
        winnerKey,
      });
    }
  } catch (error) {
    console.error(`Error parsing matchups for ${leagueKey} week ${week}:`, error);
  }

  return matchups;
}

async function calculateWeeklyRankings(
  db: ReturnType<typeof createDb>,
  leagueId: number,
  week: number,
  teams: Array<{ id: number; teamKey: string; managerId: number; name: string }>,
): Promise<void> {
  // Get all matchups up to and including this week
  const matchups = await db
    .select()
    .from(schema.matchups)
    .where(sql`${schema.matchups.leagueId} = ${leagueId} AND ${schema.matchups.week} <= ${week}`);

  // Calculate wins, losses, ties, and points for each team up to this week
  const teamStats = new Map<
    number,
    {
      wins: number;
      losses: number;
      ties: number;
      pointsFor: number;
      pointsAgainst: number;
    }
  >();

  // Initialize all teams with 0 stats
  for (const team of teams) {
    teamStats.set(team.id, {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  }

  // Calculate stats from matchups
  for (const matchup of matchups) {
    const team1Stats = teamStats.get(matchup.team1Id)!;
    const team2Stats = teamStats.get(matchup.team2Id)!;

    if (matchup.team1Points !== null && matchup.team2Points !== null) {
      team1Stats.pointsFor += matchup.team1Points;
      team1Stats.pointsAgainst += matchup.team2Points;
      team2Stats.pointsFor += matchup.team2Points;
      team2Stats.pointsAgainst += matchup.team1Points;

      if (matchup.isTie) {
        team1Stats.ties += 1;
        team2Stats.ties += 1;
      } else if (matchup.winnerId === matchup.team1Id) {
        team1Stats.wins += 1;
        team2Stats.losses += 1;
      } else if (matchup.winnerId === matchup.team2Id) {
        team2Stats.wins += 1;
        team1Stats.losses += 1;
      }
    }
  }

  // Calculate win percentage and create ranking data
  const rankingData: Array<{
    managerId: number;
    wins: number;
    losses: number;
    ties: number;
    winPct: number;
    pointsFor: number;
    pointsAgainst: number;
  }> = [];

  for (const [teamId, stats] of teamStats) {
    const totalGames = stats.wins + stats.losses + stats.ties;
    const winPct = totalGames > 0 ? stats.wins / totalGames : 0;

    const team = teams.find((t) => t.id === teamId);
    if (team) {
      rankingData.push({
        managerId: team.managerId,
        wins: stats.wins,
        losses: stats.losses,
        ties: stats.ties,
        winPct,
        pointsFor: stats.pointsFor,
        pointsAgainst: stats.pointsAgainst,
      });
    }
  }

  // Sort by win percentage, then by wins, then by point differential
  rankingData.sort((a, b) => {
    if (a.winPct !== b.winPct) return b.winPct - a.winPct;
    if (a.wins !== b.wins) return b.wins - a.wins;
    return b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
  });

  // Insert/update weekly rankings
  for (let rank = 1; rank <= rankingData.length; rank++) {
    const data = rankingData[rank - 1];
    await db
      .insert(schema.weeklyRankings)
      .values({
        leagueId,
        managerId: data.managerId,
        week,
        rank,
        wins: data.wins,
        losses: data.losses,
        ties: data.ties,
        winPct: data.winPct,
        pointsFor: data.pointsFor,
        pointsAgainst: data.pointsAgainst,
      })
      .onConflictDoUpdate({
        target: [
          schema.weeklyRankings.leagueId,
          schema.weeklyRankings.managerId,
          schema.weeklyRankings.week,
        ],
        set: {
          rank,
          wins: data.wins,
          losses: data.losses,
          ties: data.ties,
          winPct: data.winPct,
          pointsFor: data.pointsFor,
          pointsAgainst: data.pointsAgainst,
        },
      });
  }
}

async function computeRankings(db: ReturnType<typeof createDb>): Promise<number> {
  const managerStats = await db
    .select({
      managerId: schema.managers.id,
      totalWins: sql<number>`SUM(${schema.teams.wins})`,
      totalLosses: sql<number>`SUM(${schema.teams.losses})`,
      totalTies: sql<number>`SUM(${schema.teams.ties})`,
      totalPointsFor: sql<number>`SUM(${schema.teams.pointsFor})`,
      totalPointsAgainst: sql<number>`SUM(${schema.teams.pointsAgainst})`,
      seasonsPlayed: sql<number>`COUNT(DISTINCT ${schema.teams.leagueId})`,
      championships: sql<number>`SUM(CASE WHEN ${schema.teams.rank} = 1 THEN 1 ELSE 0 END)`,
      playoffAppearances: sql<number>`SUM(CASE WHEN ${schema.teams.isPlayoffTeam} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(schema.managers)
    .innerJoin(schema.teams, eq(schema.teams.managerId, schema.managers.id))
    .groupBy(schema.managers.id);

  for (const stat of managerStats) {
    const totalGames = stat.totalWins + stat.totalLosses + stat.totalTies;
    const winPct = totalGames > 0 ? stat.totalWins / totalGames : 0;
    const pointDiff = stat.totalPointsFor - stat.totalPointsAgainst;

    await db
      .insert(schema.rankings)
      .values({
        managerId: stat.managerId,
        totalWins: stat.totalWins,
        totalLosses: stat.totalLosses,
        totalTies: stat.totalTies,
        winPct,
        totalPointsFor: stat.totalPointsFor,
        totalPointsAgainst: stat.totalPointsAgainst,
        pointDiff,
        seasonsPlayed: stat.seasonsPlayed,
        championships: stat.championships,
        playoffAppearances: stat.playoffAppearances,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.rankings.managerId,
        set: {
          totalWins: stat.totalWins,
          totalLosses: stat.totalLosses,
          totalTies: stat.totalTies,
          winPct,
          totalPointsFor: stat.totalPointsFor,
          totalPointsAgainst: stat.totalPointsAgainst,
          pointDiff,
          seasonsPlayed: stat.seasonsPlayed,
          championships: stat.championships,
          playoffAppearances: stat.playoffAppearances,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  return managerStats.length;
}
