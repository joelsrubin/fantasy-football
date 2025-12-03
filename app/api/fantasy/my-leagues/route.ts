import { NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";

export interface LeagueInfo {
  leagueKey: string;
  leagueId: string;
  name: string;
  season: string;
  gameKey: string;
  numTeams: number;
  currentWeek: number;
  url: string;
  logoUrl?: string;
}

export interface SeasonData {
  season: string;
  gameKey: string;
  leagues: LeagueInfo[];
}

// Revalidate every 5 minutes
export const revalidate = 300;

export async function GET() {
  try {
    const accessToken = await getYahooAccessToken();

    const response = await fetch(
      "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=nfl/leagues?format=json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        next: { revalidate: 300, tags: ["yahoo-api", "my-leagues"] },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Yahoo API Error: ${errorText}`);
    }

    const data = await response.json();

    // Parse the response
    const seasons: SeasonData[] = [];
    
    const users = data.fantasy_content?.users;
    const user = users?.["0"]?.user;
    
    if (!user) {
      return NextResponse.json({ seasons: [] });
    }

    const games = user[1]?.games;
    const gamesCount = games?.count || 0;

    for (let i = 0; i < gamesCount; i++) {
      const game = games[i.toString()]?.game;
      if (!game) continue;

      const gameInfo = game[0];
      const leaguesData = game[1]?.leagues;
      const leaguesCount = leaguesData?.count || 0;

      const leagues: LeagueInfo[] = [];

      for (let j = 0; j < leaguesCount; j++) {
        const league = leaguesData[j.toString()]?.league?.[0];
        if (!league) continue;

        // Skip leagues that haven't drafted yet
        if (league.draft_status === "predraft") continue;

        leagues.push({
          leagueKey: league.league_key,
          leagueId: league.league_id,
          name: league.name,
          season: gameInfo.season,
          gameKey: gameInfo.game_key,
          numTeams: league.num_teams,
          currentWeek: parseInt(league.current_week, 10),
          url: league.url,
          logoUrl: league.logo_url,
        });
      }

      if (leagues.length > 0) {
        seasons.push({
          season: gameInfo.season,
          gameKey: gameInfo.game_key,
          leagues,
        });
      }
    }

    // Sort seasons descending (newest first)
    seasons.sort((a, b) => parseInt(b.season) - parseInt(a.season));

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}
