import { type NextRequest, NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";
import { createYahooFantasyAPI, type YahooMatchup } from "@/lib/yahoo-fantasy";

const ONE_YEAR = 31536000;
const CURRENT_GAME_ID = "461"; // 2025 season

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await params;

  try {
    const accessToken = await getYahooAccessToken();
    const api = createYahooFantasyAPI(accessToken);

    const leagueKey = leagueId.includes(".l.") ? decodeURIComponent(leagueId) : `461.l.${leagueId}`;
    const gameId = leagueKey.split(".")[0];
    const isHistorical = gameId !== CURRENT_GAME_ID;

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");

    let matchups: YahooMatchup[];
    if (weekParam) {
      matchups = await api.getLeagueScoreboard(leagueKey, parseInt(weekParam, 10));
    } else {
      matchups = await api.getLeagueMatchups(leagueKey);
    }

    // Cache historical data for 1 year, current season for 1 minute
    const maxAge = isHistorical ? ONE_YEAR : 60;

    return NextResponse.json(
      { matchups },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        },
      },
    );
  } catch (error) {
    console.error("Error fetching scoreboard:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scoreboard" },
      { status: 500 },
    );
  }
}
