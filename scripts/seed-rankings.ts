/**
 * Seed Rankings Script
 * Run with: pnpm run seed-rankings
 *
 * This aggregates all-time stats and stores them in Redis.
 * Run this once to populate the rankings, then the weekly cron job will keep it updated.
 */

import { config } from "dotenv";
import { createClient } from "redis";

config({ path: ".env.local" });

const YAHOO_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";
const REDIS_KEY = "all-time-rankings";

interface RankingEntry {
  name: string;
  nickname: string;
  guid: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  seasonsPlayed: number;
  championships: number;
  seasons: string[];
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function main() {
  console.log("\n🏈 Seeding All-Time Rankings\n");

  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    console.error("❌ REDIS_URL not set in .env.local");
    process.exit(1);
  }

  // Get access token from Redis
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  const tokenData = await redis.get("yahoo-tokens");
  if (!tokenData) {
    console.error("❌ No Yahoo tokens found. Run 'pnpm run setup-yahoo' first.");
    await redis.disconnect();
    process.exit(1);
  }

  const tokens: TokenData = JSON.parse(tokenData);
  const accessToken = tokens.accessToken;

  console.log("✅ Loaded tokens from Redis\n");

  // Fetch all leagues
  console.log("📋 Fetching all leagues...");
  const leagues = await getAllLeagues(accessToken);
  console.log(`   Found ${leagues.length} leagues\n`);

  // Aggregate stats
  const statsMap = new Map<string, RankingEntry>();

  for (const league of leagues) {
    process.stdout.write(`📊 Processing: ${league.name} (${league.season})... `);

    try {
      const standings = await getLeagueStandings(accessToken, league.leagueKey);

      for (const team of standings) {
        const existing = statsMap.get(team.guid);

        if (existing) {
          existing.wins += team.wins;
          existing.losses += team.losses;
          existing.ties += team.ties;
          existing.pointsFor += team.pointsFor;
          existing.pointsAgainst += team.pointsAgainst;
          existing.seasonsPlayed += 1;
          if (team.rank === 1) existing.championships += 1;
          if (!existing.seasons.includes(league.season)) {
            existing.seasons.push(league.season);
          }
          const totalGames = existing.wins + existing.losses + existing.ties;
          existing.winPct = totalGames > 0 ? (existing.wins / totalGames) * 100 : 0;
          existing.pointDiff = existing.pointsFor - existing.pointsAgainst;
        } else {
          const totalGames = team.wins + team.losses + team.ties;
          statsMap.set(team.guid, {
            guid: team.guid,
            nickname: team.nickname,
            name: team.nickname,
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            winPct: totalGames > 0 ? (team.wins / totalGames) * 100 : 0,
            pointsFor: team.pointsFor,
            pointsAgainst: team.pointsAgainst,
            pointDiff: team.pointsFor - team.pointsAgainst,
            seasonsPlayed: 1,
            championships: team.rank === 1 ? 1 : 0,
            seasons: [league.season],
          });
        }
      }

      console.log("✓");
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.log("✗");
      console.error(`   Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Sort by win percentage
  const rankings = Array.from(statsMap.values()).sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    return b.wins - a.wins;
  });

  // Save to Redis
  console.log("\n💾 Saving to Redis...");
  await redis.set(REDIS_KEY, JSON.stringify(rankings));
  await redis.disconnect();

  console.log(`\n✅ Seeded rankings for ${rankings.length} managers!\n`);

  // Print top 5
  console.log("📈 Top 5 All-Time:");
  console.log("─".repeat(50));
  rankings.slice(0, 5).forEach((r, i) => {
    console.log(
      `${i + 1}. ${r.name.padEnd(20)} ${r.wins}W-${r.losses}L (${r.winPct.toFixed(1)}%) 🏆${r.championships}`,
    );
  });
  console.log("");
}

// Helper functions

interface LeagueInfo {
  leagueKey: string;
  season: string;
  name: string;
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

async function getAllLeagues(accessToken: string): Promise<LeagueInfo[]> {
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

    const standingsData = ((league[1] as Record<string, unknown>).standings as unknown[])?.[0] as Record<string, unknown>;
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

      const managers = flatTeam.managers as Array<{ manager: Record<string, unknown> }>;
      const manager = managers?.[0]?.manager;
      if (!manager) continue;

      const standingsInfo = (teamData[2] as Record<string, unknown>)
        ?.team_standings as Record<string, unknown>;
      const outcomeTotals = standingsInfo?.outcome_totals as Record<string, string>;

      teams.push({
        guid: manager.guid as string,
        nickname: manager.nickname as string,
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

main().catch(console.error);

