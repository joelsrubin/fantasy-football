/**
 * Debug script to fetch current league details from Yahoo API
 * Run with: pnpm tsx scripts/debug-league.ts [leagueKey]
 *
 * If no leagueKey is provided, it will list all available leagues first.
 */

import { config } from "dotenv";
import { createClient } from "redis";
import type { TokenData } from "@/lib/yahoo-auth";

config({ path: ".env.local" });

const YAHOO_FANTASY_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

async function getTokens(): Promise<TokenData> {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    console.error("❌ REDIS_URL not set in .env.local\n");
    process.exit(1);
  }

  const redis = createClient({ url: REDIS_URL });
  await redis.connect();
  const data = await redis.get("yahoo-tokens");
  await redis.quit();

  if (!data) {
    console.error("❌ No tokens found in Redis. Run 'pnpm run setup-yahoo' first.\n");
    process.exit(1);
  }

  return JSON.parse(data);
}

async function fetchYahooAPI<T>(accessToken: string, endpoint: string): Promise<T> {
  const url = `${YAHOO_FANTASY_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yahoo API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function listUserLeagues(accessToken: string): Promise<string | null> {
  console.log("📡 Fetching your Yahoo Fantasy leagues...\n");

  const data = await fetchYahooAPI<Record<string, unknown>>(
    accessToken,
    "/users;use_login=1/games;game_codes=nfl/leagues?format=json",
  );

  const fantasyContent = data.fantasy_content as Record<string, unknown>;
  const users = fantasyContent?.users as Record<string, unknown>;
  const userWrapper = users?.["0"] as Record<string, unknown>;
  const user = userWrapper?.user as unknown[];

  if (!user) {
    console.log("No user data found in response");
    return null;
  }

  const gamesWrapper = user[1] as Record<string, unknown>;
  const games = gamesWrapper?.games as Record<string, unknown>;
  const gamesCount = (games?.count as number) || 0;

  if (gamesCount === 0) {
    console.log("No NFL fantasy games found for this account.\n");
    return null;
  }

  let latestLeagueKey: string | null = null;

  console.log("🏈 Your NFL Fantasy Leagues:\n");
  console.log("─".repeat(60));

  for (let i = 0; i < gamesCount; i++) {
    const gameWrapper = games[i.toString()] as Record<string, unknown>;
    const game = gameWrapper?.game as unknown[];
    if (!game) continue;

    const gameInfo = game[0] as Record<string, unknown>;
    const gameData = game[1] as Record<string, unknown>;
    const leagues = gameData?.leagues as Record<string, unknown>;
    const leaguesCount = (leagues?.count as number) || 0;

    console.log(`\n📅 ${gameInfo.season} Season (Game Key: ${gameInfo.game_key})`);

    for (let j = 0; j < leaguesCount; j++) {
      const leagueWrapper = leagues[j.toString()] as Record<string, unknown>;
      const leagueData = leagueWrapper?.league as unknown[];
      const league = leagueData?.[0] as Record<string, unknown>;
      if (!league) continue;

      // Track the most recent league
      if (!latestLeagueKey || (gameInfo.season as string) >= "2024") {
        latestLeagueKey = league.league_key as string;
      }

      console.log(`\n   League: ${league.name}`);
      console.log(`   League Key: ${league.league_key}`);
      console.log(`   League ID: ${league.league_id}`);
      console.log(`   Teams: ${league.num_teams}`);
      console.log(`   Current Week: ${league.current_week}`);
    }
  }

  console.log(`\n${"─".repeat(60)}\n`);

  return latestLeagueKey;
}

async function fetchLeagueDetails(accessToken: string, leagueKey: string): Promise<void> {
  console.log(`\n🔍 Fetching details for league: ${leagueKey}\n`);
  console.log("═".repeat(60));

  // Fetch league info
  console.log("\n📋 LEAGUE INFO\n");
  const leagueData = await fetchYahooAPI<Record<string, unknown>>(
    accessToken,
    `/league/${leagueKey}?format=json`,
  );

  const fantasy = leagueData.fantasy_content as Record<string, unknown>;
  const league = (fantasy?.league as unknown[])?.[0] as Record<string, unknown>;

  if (league) {
    console.log(`   Name: ${league.name}`);
    console.log(`   League Key: ${league.league_key}`);
    console.log(`   Season: ${league.season}`);
    console.log(`   Current Week: ${league.current_week}`);
    console.log(`   Start Week: ${league.start_week}`);
    console.log(`   End Week: ${league.end_week}`);
    console.log(`   Num Teams: ${league.num_teams}`);
    console.log(`   Scoring Type: ${league.scoring_type}`);
    console.log(`   Draft Status: ${league.draft_status}`);
    console.log(`   Logo URL: ${league.logo_url || "None"}`);
    console.log(`   URL: ${league.url}`);
  }

  // Fetch standings
  console.log("\n📊 STANDINGS\n");
  const standingsData = await fetchYahooAPI<Record<string, unknown>>(
    accessToken,
    `/league/${leagueKey}/standings?format=json`,
  );

  const standingsFantasy = standingsData.fantasy_content as Record<string, unknown>;
  const standingsLeague = standingsFantasy?.league as unknown[];
  const standings = (standingsLeague?.[1] as Record<string, unknown>)?.standings as unknown[];
  const teamsData = (standings?.[0] as Record<string, unknown>)?.teams as Record<string, unknown>;
  const teamsCount = (teamsData?.count as number) || 0;

  console.log("   Rank | Team                           | Record    | Points For");
  console.log(`   ${"─".repeat(65)}`);

  for (let i = 0; i < teamsCount; i++) {
    const teamData = (teamsData?.[i.toString()] as Record<string, unknown>)?.team as unknown[];
    if (!teamData) continue;

    // Flatten team info
    const teamInfo: Record<string, unknown> = {};
    for (const item of teamData[0] as unknown[]) {
      if (typeof item === "object" && item !== null) {
        Object.assign(teamInfo, item);
      }
    }

    const teamStandings = (teamData[2] as Record<string, unknown>)?.team_standings as Record<
      string,
      unknown
    >;
    const outcomes = teamStandings?.outcome_totals as Record<string, unknown>;

    const rank = teamStandings?.rank || "?";
    const name = ((teamInfo.name as string) || "Unknown").padEnd(30);
    const wins = outcomes?.wins || 0;
    const losses = outcomes?.losses || 0;
    const ties = outcomes?.ties || 0;
    const record = `${wins}-${losses}${Number(ties) > 0 ? `-${ties}` : ""}`.padEnd(9);
    const pointsFor = teamStandings?.points_for || 0;

    console.log(`   ${String(rank).padStart(4)} | ${name} | ${record} | ${pointsFor}`);
  }

  // Fetch current week scoreboard
  const currentWeek = league?.current_week as number;
  if (currentWeek) {
    console.log(`\n🏈 WEEK ${currentWeek} SCOREBOARD\n`);

    const scoreboardData = await fetchYahooAPI<Record<string, unknown>>(
      accessToken,
      `/league/${leagueKey}/scoreboard;week=${currentWeek}?format=json`,
    );

    const sbFantasy = scoreboardData.fantasy_content as Record<string, unknown>;
    const sbLeague = sbFantasy?.league as unknown[];
    const scoreboard = (sbLeague?.[1] as Record<string, unknown>)?.scoreboard as Record<
      string,
      unknown
    >;
    const matchupsData = (scoreboard?.["0"] as Record<string, unknown>)?.matchups as Record<
      string,
      unknown
    >;
    const matchupsCount = (matchupsData?.count as number) || 0;

    for (let i = 0; i < matchupsCount; i++) {
      const matchup = (matchupsData?.[i.toString()] as Record<string, unknown>)?.matchup as Record<
        string,
        unknown
      >;
      if (!matchup) continue;

      const matchupTeams = (matchup["0"] as Record<string, unknown>)?.teams as Record<
        string,
        unknown
      >;
      const team1Data = (matchupTeams?.["0"] as Record<string, unknown>)?.team as unknown[];
      const team2Data = (matchupTeams?.["1"] as Record<string, unknown>)?.team as unknown[];

      const getTeamInfo = (teamData: unknown[]) => {
        const info: Record<string, unknown> = {};
        for (const item of teamData[0] as unknown[]) {
          if (typeof item === "object" && item !== null) {
            Object.assign(info, item);
          }
        }
        const points = (teamData[1] as Record<string, unknown>)?.team_points as Record<
          string,
          unknown
        >;
        return {
          name: info.name as string,
          points: (points?.total as string) || "0",
        };
      };

      const t1 = getTeamInfo(team1Data);
      const t2 = getTeamInfo(team2Data);

      const status = matchup.status as string;
      const statusLabel =
        status === "postevent" ? "Final" : status === "midevent" ? "Live" : "Upcoming";

      console.log(`   ${t1.name}`);
      console.log(`      ${t1.points} pts`);
      console.log(`   vs`);
      console.log(`   ${t2.name}`);
      console.log(`      ${t2.points} pts`);
      console.log(`   [${statusLabel}]`);
      console.log("");
    }
  }

  // Raw league data for debugging
  console.log("\n📦 RAW LEAGUE DATA\n");
  console.log(JSON.stringify(league, null, 2));

  console.log(`\n${"═".repeat(60)}`);
  console.log("✅ Done!\n");
}

async function main() {
  console.log("\n🔍 Debug: Fetch League Details from Yahoo API\n");

  const tokens = await getTokens();
  console.log("✅ Tokens loaded from Redis");
  console.log(`   Token expires: ${new Date(tokens.expiresAt).toLocaleString()}`);
  console.log(`   Token expired: ${Date.now() > tokens.expiresAt ? "YES ⚠️" : "NO ✓"}\n`);

  // Check if a league key was provided as argument
  let leagueKey = process.argv[2];

  if (!leagueKey) {
    // List leagues and use the most recent one
    const latestLeague = await listUserLeagues(tokens.accessToken);
    if (latestLeague) {
      console.log(`💡 Using most recent league: ${latestLeague}`);
      console.log(
        `   To specify a different league, run: pnpm tsx scripts/debug-league.ts <leagueKey>\n`,
      );
      leagueKey = latestLeague;
    } else {
      console.log("❌ No leagues found. Make sure you have at least one NFL fantasy league.\n");
      process.exit(1);
    }
  }

  await fetchLeagueDetails(tokens.accessToken, leagueKey);
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
