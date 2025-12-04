/**
 * Aggregate Win/Loss Stats Script
 * Run with: pnpm tsx scripts/aggregate-stats.ts
 *
 * This aggregates win/loss data across all seasons and outputs to CSV.
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const YAHOO_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

// Map Yahoo nicknames to real names (add your mappings here)
const NAME_MAP: Record<string, string> = {
  // "YahooNickname": "Real Name",
  // Example:
  // "fantasyguru99": "John Smith",
};

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface ManagerStats {
  guid: string;
  nickname: string;
  realName: string;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  seasonsPlayed: number;
  championships: number;
  seasons: string[];
}

async function getAccessToken(): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const tokenPath = join(process.cwd(), ".yahoo-tokens.json");

  try {
    const data = await readFile(tokenPath, "utf-8");
    const tokens: TokenData = JSON.parse(data);

    // Check if token needs refresh
    if (Date.now() >= tokens.expiresAt - 60000) {
      console.log("🔄 Refreshing access token...");
      return await refreshToken(tokens.refreshToken);
    }

    return tokens.accessToken;
  } catch {
    throw new Error("No tokens found. Run 'pnpm run setup-yahoo' first.");
  }
}

async function refreshToken(refreshToken: string): Promise<string> {
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
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${await response.text()}`);
  }

  const data = await response.json();

  // Save new tokens
  const tokens: TokenData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await writeFile(join(process.cwd(), ".yahoo-tokens.json"), JSON.stringify(tokens, null, 2));

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
    throw new Error(`Yahoo API Error: ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

interface LeagueInfo {
  leagueKey: string;
  season: string;
  name: string;
}

async function getAllLeagues(accessToken: string): Promise<LeagueInfo[]> {
  console.log("📋 Fetching all leagues...");

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

      // Skip predraft leagues
      if (league.draft_status === "predraft") continue;

      leagues.push({
        leagueKey: league.league_key as string,
        season: gameInfo.season as string,
        name: league.name as string,
      });
    }
  }

  return leagues;
}

interface StandingsTeam {
  guid: string;
  nickname: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

async function getLeagueStandings(
  accessToken: string,
  leagueKey: string,
): Promise<StandingsTeam[]> {
  const data = await yahooRequest<Record<string, unknown>>(
    accessToken,
    `/league/${leagueKey}/standings?format=json`,
  );

  const teams: StandingsTeam[] = [];

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

      // Parse team info (flattened array)
      const teamInfo = teamData[0] as unknown[];
      const flatTeam: Record<string, unknown> = {};
      for (const item of teamInfo) {
        if (typeof item === "object" && item !== null) {
          Object.assign(flatTeam, item);
        }
      }

      // Get manager info
      const managers = flatTeam.managers as Array<{ manager: Record<string, unknown> }>;
      const manager = managers?.[0]?.manager;

      if (!manager) continue;

      // Get standings data
      const standingsInfo = (teamData[2] as Record<string, unknown>)?.team_standings as Record<
        string,
        unknown
      >;
      const outcomeTotals = standingsInfo?.outcome_totals as Record<string, string>;

      teams.push({
        guid: manager.guid as string,
        nickname: manager.nickname as string,
        teamName: flatTeam.name as string,
        wins: parseInt(outcomeTotals?.wins || "0", 10),
        losses: parseInt(outcomeTotals?.losses || "0", 10),
        ties: parseInt(outcomeTotals?.ties || "0", 10),
        pointsFor: parseFloat(standingsInfo?.points_for as string) || 0,
        pointsAgainst: parseFloat(standingsInfo?.points_against as string) || 0,
        rank: parseInt(standingsInfo?.rank as string, 10) || 0,
      });
    }
  } catch (error) {
    console.error(`Error parsing standings for ${leagueKey}:`, error);
  }

  return teams;
}

function getRealName(nickname: string): string {
  return NAME_MAP[nickname] || nickname;
}

async function main() {
  console.log("\n🏈 Fantasy Football Stats Aggregator\n");

  try {
    const accessToken = await getAccessToken();
    const leagues = await getAllLeagues(accessToken);

    console.log(`Found ${leagues.length} leagues\n`);

    // Aggregate stats by manager guid
    const statsMap = new Map<string, ManagerStats>();

    for (const league of leagues) {
      console.log(`📊 Processing: ${league.name} (${league.season})`);

      try {
        const standings = await getLeagueStandings(accessToken, league.leagueKey);

        for (const team of standings) {
          const existing = statsMap.get(team.guid);

          if (existing) {
            existing.totalWins += team.wins;
            existing.totalLosses += team.losses;
            existing.totalTies += team.ties;
            existing.totalPointsFor += team.pointsFor;
            existing.totalPointsAgainst += team.pointsAgainst;
            existing.seasonsPlayed += 1;
            if (team.rank === 1) existing.championships += 1;
            if (!existing.seasons.includes(league.season)) {
              existing.seasons.push(league.season);
            }
          } else {
            statsMap.set(team.guid, {
              guid: team.guid,
              nickname: team.nickname,
              realName: getRealName(team.nickname),
              totalWins: team.wins,
              totalLosses: team.losses,
              totalTies: team.ties,
              totalPointsFor: team.pointsFor,
              totalPointsAgainst: team.pointsAgainst,
              seasonsPlayed: 1,
              championships: team.rank === 1 ? 1 : 0,
              seasons: [league.season],
            });
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`  ❌ Error: ${error instanceof Error ? error.message : error}`);
      }
    }

    // Convert to array and sort by total wins
    const stats = Array.from(statsMap.values()).sort((a, b) => b.totalWins - a.totalWins);

    // Generate CSV
    const csvHeader = [
      "Real Name",
      "Nickname",
      "Total Wins",
      "Total Losses",
      "Total Ties",
      "Win %",
      "Points For",
      "Points Against",
      "Point Diff",
      "Seasons Played",
      "Championships",
      "Seasons",
    ].join(",");

    const csvRows = stats.map((s) => {
      const totalGames = s.totalWins + s.totalLosses + s.totalTies;
      const winPct = totalGames > 0 ? ((s.totalWins / totalGames) * 100).toFixed(1) : "0.0";
      const pointDiff = (s.totalPointsFor - s.totalPointsAgainst).toFixed(1);

      return [
        `"${s.realName}"`,
        `"${s.nickname}"`,
        s.totalWins,
        s.totalLosses,
        s.totalTies,
        `${winPct}%`,
        s.totalPointsFor.toFixed(1),
        s.totalPointsAgainst.toFixed(1),
        pointDiff,
        s.seasonsPlayed,
        s.championships,
        `"${s.seasons.sort().join(", ")}"`,
      ].join(",");
    });

    const csv = [csvHeader, ...csvRows].join("\n");

    // Write to file
    const outputPath = join(process.cwd(), "data", "all-time-stats.csv");
    await writeFile(outputPath, csv);

    console.log(`\n✅ Stats aggregated for ${stats.length} managers`);
    console.log(`📁 Saved to: ${outputPath}\n`);

    // Print summary
    console.log("📈 Top 5 All-Time:");
    console.log("─".repeat(60));
    stats.slice(0, 5).forEach((s, i) => {
      const totalGames = s.totalWins + s.totalLosses + s.totalTies;
      const winPct = totalGames > 0 ? ((s.totalWins / totalGames) * 100).toFixed(1) : "0.0";
      console.log(
        `${i + 1}. ${s.realName.padEnd(20)} ${s.totalWins}W-${s.totalLosses}L (${winPct}%) 🏆${s.championships}`,
      );
    });
    console.log("");
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
