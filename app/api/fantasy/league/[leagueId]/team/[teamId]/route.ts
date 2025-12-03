import { type NextRequest, NextResponse } from "next/server";
import { getYahooAccessToken } from "@/lib/yahoo-auth";
import { createYahooFantasyAPI } from "@/lib/yahoo-fantasy";

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
    const leagueKey = decodedLeagueId.includes(".l.") ? decodedLeagueId : `461.l.${decodedLeagueId}`;

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

    return NextResponse.json({ roster });
  } catch (error) {
    console.error("Error fetching team roster:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch team roster" },
      { status: 500 },
    );
  }
}
