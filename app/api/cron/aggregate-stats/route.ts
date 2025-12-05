import { createClient } from "redis";
import { NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";

const YAHOO_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";
const REDIS_KEY = "all-time-rankings";

export interface RankingEntry {
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

// This route is called by Vercel cron
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("🏈 Starting stats aggregation...");

  try {
    const accessToken = await getYahooAccessToken();
    const leagues = await getAllLeagues(accessToken);

    console.log(`Found ${leagues.length} leagues`);

    // Aggregate stats by manager guid
    const statsMap = new Map<string, RankingEntry>();

    for (const league of leagues) {
      console.log(`Processing: ${league.name} (${league.season})`);

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
            // Recalculate win pct
            const totalGames = existing.wins + existing.losses + existing.ties;
            existing.winPct = totalGames > 0 ? (existing.wins / totalGames) * 100 : 0;
            existing.pointDiff = existing.pointsFor - existing.pointsAgainst;
          } else {
            const totalGames = team.wins + team.losses + team.ties;
            statsMap.set(team.guid, {
              guid: team.guid,
              nickname: team.nickname,
              name: team.nickname, // Use nickname as name (can be mapped later)
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

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing ${league.name}:`, error);
      }
    }

    // Convert to array and sort by win percentage
    const rankings = Array.from(statsMap.values()).sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.wins - a.wins;
    });

    // Store in Redis
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return NextResponse.json({ error: "REDIS_URL not configured" }, { status: 500 });
    }

    const client = createClient({ url: redisUrl });
    await client.connect();

    await client.set(REDIS_KEY, JSON.stringify(rankings));
    await client.disconnect();

    console.log(`✅ Aggregated stats for ${rankings.length} managers`);

    return NextResponse.json({
      success: true,
      managersCount: rankings.length,
      leaguesProcessed: leagues.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to aggregate stats" },
      { status: 500 },
    );
  }
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

      // Parse team info
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

