import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";
import { createYahooFantasyAPI } from "@/lib/yahoo-fantasy";

const ONE_YEAR = 31536000;
const CURRENT_SEASON = new Date().getFullYear();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await params;

  try {
    const accessToken = await getYahooAccessToken();
    const api = createYahooFantasyAPI(accessToken);

    // leagueId can be full key (449.l.123456) or just ID (123456)
    // If just ID, default to current season (461)
    const leagueKey = leagueId.includes(".l.") ? decodeURIComponent(leagueId) : `461.l.${leagueId}`;

    const league = await api.getLeague(leagueKey);

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Cache historical data for 1 year, current season for 5 minutes
    const isHistorical = parseInt(league.season) < CURRENT_SEASON;
    const maxAge = isHistorical ? ONE_YEAR : 300;

    return NextResponse.json(
      { league },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        },
      },
    );
  } catch (error) {
    console.error("Error fetching league:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch league" },
      { status: 500 },
    );
  }
}
