import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";
import { createYahooFantasyAPI } from "@/lib/yahoo-fantasy";

const ONE_YEAR = 31536000;
const CURRENT_GAME_ID = "461"; // 2025 season

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await params;

  try {
    const accessToken = await getYahooAccessToken();
    const api = createYahooFantasyAPI(accessToken);

    const leagueKey = leagueId.includes(".l.") ? decodeURIComponent(leagueId) : `461.l.${leagueId}`;
    const gameId = leagueKey.split(".")[0];
    const isHistorical = gameId !== CURRENT_GAME_ID;

    const standings = await api.getLeagueStandings(leagueKey);

    // Cache historical data for 1 year, current season for 2 minutes
    const maxAge = isHistorical ? ONE_YEAR : 120;

    return NextResponse.json(
      { standings },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        },
      },
    );
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch standings" },
      { status: 500 },
    );
  }
}
