import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";
import { createYahooFantasyAPI } from "@/lib/yahoo-fantasy";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;

  try {
    const accessToken = await getYahooAccessToken();
    const api = createYahooFantasyAPI(accessToken);
    
    // leagueId can be full key (449.l.123456) or just ID (123456)
    // If just ID, default to current season (461)
    const leagueKey = leagueId.includes(".l.") 
      ? decodeURIComponent(leagueId) 
      : `461.l.${leagueId}`;
    
    const league = await api.getLeague(leagueKey);
    
    if (!league) {
      return NextResponse.json(
        { error: "League not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ league });
  } catch (error) {
    console.error("Error fetching league:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch league" },
      { status: 500 }
    );
  }
}
