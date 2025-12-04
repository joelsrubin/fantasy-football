import { type NextRequest, NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";
import { createYahooFantasyAPI } from "@/lib/yahoo-fantasy";

const ONE_YEAR = 31536000;
const CURRENT_GAME_ID = "461"; // 2025 season

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; teamId: string }> },
) {
  const { leagueId, teamId } = await params;

  try {
    const accessToken = await getYahooAccessToken();
    const api = createYahooFantasyAPI(accessToken);

    // Decode the leagueId in case it's URL encoded
    const decodedLeagueId = decodeURIComponent(leagueId);
    const leagueKey = decodedLeagueId.includes(".l.")
      ? decodedLeagueId
      : `461.l.${decodedLeagueId}`;
    const gameId = leagueKey.split(".")[0];
    const isHistorical = gameId !== CURRENT_GAME_ID;

    const teamKey = `${leagueKey}.t.${teamId}`;

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");
    const week = weekParam ? parseInt(weekParam, 10) : undefined;

    // Debug: get raw response
    const debug = searchParams.get("debug") === "true";
    if (debug) {
      const rawData = await api.getTeamRosterRaw(teamKey, week);
      return NextResponse.json({ raw: rawData });
    }

    const roster = await api.getTeamRoster(teamKey, week);

    // Cache historical data for 1 year, current season for 2 minutes
    const maxAge = isHistorical ? ONE_YEAR : 120;

    return NextResponse.json(
      { roster },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        },
      },
    );
  } catch (error) {
    console.error("Error fetching team roster:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch team roster" },
      { status: 500 },
    );
  }
}
