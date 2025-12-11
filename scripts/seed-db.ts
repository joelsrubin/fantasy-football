/**
 * Seed Database Script
 * Run with: pnpm run seed-db
 *
 * Fetches all historical data from Yahoo Fantasy API and populates the database.
 * This should be run once to initialize the database, then the weekly cron will keep it updated.
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

config({ path: ".env.local" });

const YAHOO_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

// Token management
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let cachedToken: TokenData | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  // Try to load from Redis first
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const { createClient: createRedisClient } = await import("redis");
    const redis = createRedisClient({ url: redisUrl });
    await redis.connect();

    const tokenData = await redis.get("yahoo-tokens");
    await redis.disconnect();

    if (tokenData) {
      const tokens: TokenData = JSON.parse(tokenData);
      if (Date.now() < tokens.expiresAt - 60000) {
        cachedToken = tokens;
        return tokens.accessToken;
      }
      // Token expired, need to refresh
      return refreshToken(tokens.refreshToken);
    }
  }

  throw new Error("No Yahoo tokens found. Run 'pnpm setup-yahoo' first.");
}

async function refreshToken(refreshTokenValue: string): Promise<string> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing YAHOO_CLIENT_ID or YAHOO_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${await response.text()}`);
  }

  const data = await response.json();

  const tokens: TokenData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshTokenValue,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  // Save refreshed token back to Redis
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const { createClient: createRedisClient } = await import("redis");
    const redis = createRedisClient({ url: redisUrl });
    await redis.connect();
    await redis.set("yahoo-tokens", JSON.stringify(tokens), { EX: 60 * 60 * 24 * 30 });
    await redis.disconnect();
  }

  cachedToken = tokens;
  return tokens.accessToken;
}

async function yahooRequest<T>(accessToken: string, endpoint: string): Promise<T> {
  const response = await fetch(`${YAHOO_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo API Error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// Database setup
function createDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_DATABASE_URL not set");

  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

// Yahoo API data fetching

interface LeagueInfo {
  leagueKey: string;
  leagueId: string;
  gameKey: string;
  name: string;
  season: string;
  numTeams: number;
  currentWeek: number;
  startWeek: number;
  endWeek: number;
  isFinished: boolean;
  logoUrl?: string;
  url?: string;
}

interface TeamInfo {
  teamKey: string;
  teamId: string;
  name: string;
  logoUrl?: string;
  url?: string;
  managerGuid: string;
  managerNickname: string;
  managerImageUrl?: string;
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

async function fetchAllLeagues(accessToken: string): Promise<LeagueInfo[]> {
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
    const leaguesData = (game[1] as Record<string, unknown>)?.leagues as Record<string, unknown>;
    const leaguesCount = (leaguesData?.count as number) || 0;

    for (let j = 0; j < leaguesCount; j++) {
      const leagueArray = (leaguesData[j.toString()] as Record<string, unknown>)
        ?.league as unknown[];
      const league = leagueArray?.[0] as Record<string, unknown>;
      if (!league) continue;

      // Skip pre-draft leagues
      if (league.draft_status === "predraft") continue;

      leagues.push({
        leagueKey: league.league_key as string,
        leagueId: league.league_id as string,
        gameKey: gameInfo.game_key as string,
        name: league.name as string,
        season: gameInfo.season as string,
        numTeams: parseInt(league.num_teams as string, 10),
        currentWeek: parseInt(league.current_week as string, 10) || 1,
        startWeek: parseInt(league.start_week as string, 10) || 1,
        endWeek: parseInt(league.end_week as string, 10) || 17,
        isFinished: league.is_finished === "1" || league.is_finished === 1,
        logoUrl: league.logo_url as string | undefined,
        url: league.url as string | undefined,
      });
    }
  }

  return leagues;
}

async function fetchLeagueStandings(accessToken: string, leagueKey: string): Promise<TeamInfo[]> {
  const data = await yahooRequest<Record<string, unknown>>(
    accessToken,
    `/league/${leagueKey}/standings?format=json`,
  );

  const teams: TeamInfo[] = [];

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

      // Flatten team info array
      const teamInfo = teamData[0] as unknown[];
      const flatTeam: Record<string, unknown> = {};
      for (const item of teamInfo) {
        if (typeof item === "object" && item !== null) {
          Object.assign(flatTeam, item);
        }
      }

      // Get manager info
      const managersArray = flatTeam.managers as Array<{ manager: Record<string, unknown> }>;
      const manager = managersArray?.[0]?.manager;
      if (!manager) continue;

      // Get standings info - it's in teamData[2]
      const standingsInfo = (teamData[2] as Record<string, unknown>)?.team_standings as Record<
        string,
        unknown
      >;
      const outcomeTotals = standingsInfo?.outcome_totals as Record<string, string>;

      // Get team logo
      const teamLogos = flatTeam.team_logos as Array<{ team_logo: { url: string } }>;
      const logoUrl = teamLogos?.[0]?.team_logo?.url;

      teams.push({
        teamKey: flatTeam.team_key as string,
        teamId: flatTeam.team_id as string,
        name: flatTeam.name as string,
        logoUrl,
        url: flatTeam.url as string | undefined,
        managerGuid: manager.guid as string,
        managerNickname: manager.nickname as string,
        managerImageUrl: manager.image_url as string | undefined,
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

async function fetchLeagueMatchups(
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

// Main seed function
async function main() {
  console.log("\n🏈 Fantasy Football Database Seeder\n");
  console.log("=".repeat(50));

  // Initialize
  let accessToken = await getAccessToken();
  console.log("✅ Loaded Yahoo access token\n");

  const db = createDb();
  console.log("✅ Connected to Turso database\n");

  // Fetch all leagues
  console.log("📋 Fetching leagues from Yahoo...");
  const leagues = await fetchAllLeagues(accessToken);
  console.log(`   Found ${leagues.length} leagues\n`);

  // Process each league
  let totalTeams = 0;
  let totalMatchups = 0;
  const managerMap = new Map<string, number>(); // guid -> db id
  const teamKeyToId = new Map<string, number>(); // teamKey -> db id

  for (const league of leagues) {
    console.log(`\n📊 ${league.name} (${league.season})`);

    try {
      // Insert or update league
      const [insertedLeague] = await db
        .insert(schema.leagues)
        .values({
          leagueKey: league.leagueKey,
          leagueId: league.leagueId,
          gameKey: league.gameKey,
          name: league.name,
          season: league.season,
          numTeams: league.numTeams,
          currentWeek: league.currentWeek,
          startWeek: league.startWeek,
          endWeek: league.endWeek,
          isFinished: league.isFinished,
          logoUrl: league.logoUrl,
          url: league.url,
        })
        .onConflictDoUpdate({
          target: schema.leagues.leagueKey,
          set: {
            name: league.name,
            currentWeek: league.currentWeek,
            isFinished: league.isFinished,
          },
        })
        .returning();

      // Fetch standings/teams
      process.stdout.write("   Teams: ");
      const teams = await fetchLeagueStandings(accessToken, league.leagueKey);

      for (const team of teams) {
        // Ensure manager exists
        let managerId = managerMap.get(team.managerGuid);

        if (!managerId) {
          const [insertedManager] = await db
            .insert(schema.managers)
            .values({
              guid: team.managerGuid,
              nickname: team.managerNickname,
              imageUrl: team.managerImageUrl,
            })
            .onConflictDoUpdate({
              target: schema.managers.guid,
              set: {
                nickname: team.managerNickname,
                imageUrl: team.managerImageUrl,
              },
            })
            .returning();

          managerId = insertedManager.id;
          managerMap.set(team.managerGuid, managerId);
        }

        // Insert or update team
        // A team made the playoffs if they have a playoff seed
        const isPlayoffTeam = team.playoffSeed !== undefined && team.playoffSeed > 0;

        const [insertedTeam] = await db
          .insert(schema.teams)
          .values({
            teamKey: team.teamKey,
            teamId: team.teamId,
            leagueId: insertedLeague.id,
            managerId,
            name: team.name,
            logoUrl: team.logoUrl,
            url: team.url,
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            winPct: team.winPct,
            pointsFor: team.pointsFor,
            pointsAgainst: team.pointsAgainst,
            rank: team.rank,
            playoffSeed: team.playoffSeed,
            isPlayoffTeam,
          })
          .onConflictDoUpdate({
            target: schema.teams.teamKey,
            set: {
              name: team.name,
              wins: team.wins,
              losses: team.losses,
              ties: team.ties,
              winPct: team.winPct,
              pointsFor: team.pointsFor,
              pointsAgainst: team.pointsAgainst,
              rank: team.rank,
              playoffSeed: team.playoffSeed,
              isPlayoffTeam,
            },
          })
          .returning();

        teamKeyToId.set(team.teamKey, insertedTeam.id);
        totalTeams++;
      }
      console.log(`✓ (${teams.length})`);

      // Fetch matchups for all weeks
      // Determine how many weeks to fetch
      const weeksToFetch = league.isFinished ? league.endWeek : Math.max(league.currentWeek - 1, 0); // Don't fetch current incomplete week

      if (weeksToFetch > 0) {
        process.stdout.write(`   Matchups: weeks 1-${weeksToFetch} `);
        let leagueMatchups = 0;

        for (let week = league.startWeek; week <= weeksToFetch; week++) {
          // Refresh token if needed (long running process)
          accessToken = await getAccessToken();

          const matchups = await fetchLeagueMatchups(accessToken, league.leagueKey, week);

          for (const matchup of matchups) {
            const team1Id = teamKeyToId.get(matchup.team1Key);
            const team2Id = teamKeyToId.get(matchup.team2Key);
            const winnerId = matchup.winnerKey ? teamKeyToId.get(matchup.winnerKey) : null;

            if (!team1Id || !team2Id) {
              console.warn(`   ⚠️ Missing team ID for matchup week ${week}`);
              continue;
            }

            // Upsert matchup
            await db
              .insert(schema.matchups)
              .values({
                leagueId: insertedLeague.id,
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

            leagueMatchups++;
            totalMatchups++;
          }

          process.stdout.write(".");

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        console.log(` ✓ (${leagueMatchups})`);
      } else {
        console.log("   Matchups: skipped (no completed weeks)");
      }

      // Small delay between leagues
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.log("✗");
      console.error(`   Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Compute and store rankings
  console.log("\n📈 Computing all-time rankings...");
  await computeRankings(db);

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log("✅ Seed complete!");
  console.log(`   • ${leagues.length} leagues`);
  console.log(`   • ${managerMap.size} managers`);
  console.log(`   • ${totalTeams} teams`);
  console.log(`   • ${totalMatchups} matchups`);
  console.log("");
}

async function computeRankings(db: ReturnType<typeof createDb>) {
  // Get basic stats from teams table, joining with leagues to check isFinished for championships
  const managerStats = await db
    .select({
      managerId: schema.managers.id,
      totalWins: sql<number>`SUM(${schema.teams.wins})`,
      totalLosses: sql<number>`SUM(${schema.teams.losses})`,
      totalTies: sql<number>`SUM(${schema.teams.ties})`,
      totalPointsFor: sql<number>`SUM(${schema.teams.pointsFor})`,
      totalPointsAgainst: sql<number>`SUM(${schema.teams.pointsAgainst})`,
      seasonsPlayed: sql<number>`COUNT(DISTINCT ${schema.teams.leagueId})`,
      // Only count championships when league is finished
      championships: sql<number>`SUM(CASE WHEN ${schema.teams.rank} = 1 AND ${schema.leagues.isFinished} = 1 THEN 1 ELSE 0 END)`,
      // Count playoff appearances from both isPlayoffTeam field AND playoffSeed
      playoffAppearances: sql<number>`SUM(CASE WHEN ${schema.teams.isPlayoffTeam} = 1 OR ${schema.teams.playoffSeed} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(schema.managers)
    .innerJoin(schema.teams, eq(schema.teams.managerId, schema.managers.id))
    .innerJoin(schema.leagues, eq(schema.teams.leagueId, schema.leagues.id))
    .groupBy(schema.managers.id);

  // Also count playoff appearances from matchup data (most reliable source)
  // This counts distinct league/team combinations that participated in playoff matchups
  const playoffAppearancesFromMatchups = await db
    .select({
      managerId: schema.teams.managerId,
      playoffAppearances: sql<number>`COUNT(DISTINCT ${schema.teams.leagueId})`,
    })
    .from(schema.matchups)
    .innerJoin(
      schema.teams,
      sql`(${schema.teams.id} = ${schema.matchups.team1Id} OR ${schema.teams.id} = ${schema.matchups.team2Id})`,
    )
    .where(eq(schema.matchups.isPlayoff, true))
    .groupBy(schema.teams.managerId);

  // Create a map for quick lookup
  const playoffAppearancesMap = new Map<number, number>();
  for (const row of playoffAppearancesFromMatchups) {
    playoffAppearancesMap.set(row.managerId, row.playoffAppearances);
  }

  for (const stat of managerStats) {
    const totalGames = stat.totalWins + stat.totalLosses + stat.totalTies;
    const winPct = totalGames > 0 ? stat.totalWins / totalGames : 0;
    const pointDiff = stat.totalPointsFor - stat.totalPointsAgainst;

    // Use the higher value between the two sources for playoff appearances
    const playoffAppearancesFromTeams = stat.playoffAppearances || 0;
    const playoffAppearancesFromGames = playoffAppearancesMap.get(stat.managerId) || 0;
    const playoffAppearances = Math.max(playoffAppearancesFromTeams, playoffAppearancesFromGames);

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
        playoffAppearances,
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
          playoffAppearances,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  console.log(`   Updated rankings for ${managerStats.length} managers`);
}

main().catch(console.error);
