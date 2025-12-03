import { type NextRequest, NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";
import { createYahooFantasyAPI, type YahooMatchup } from "@/lib/yahoo-fantasy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await params;

  try {
    const accessToken = await getYahooAccessToken();
    const api = createYahooFantasyAPI(accessToken);

    const leagueKey = leagueId.includes(".l.") ? decodeURIComponent(leagueId) : `461.l.${leagueId}`;

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");

    let matchups: YahooMatchup[];
    if (weekParam) {
      matchups = await api.getLeagueScoreboard(leagueKey, parseInt(weekParam, 10));
    } else {
      matchups = await api.getLeagueMatchups(leagueKey);
    }

    return NextResponse.json({ matchups });
  } catch (error) {
    console.error("Error fetching scoreboard:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scoreboard" },
      { status: 500 },
    );
  }
}
