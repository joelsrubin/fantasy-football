import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";

const ONE_YEAR = 31536000;
const CURRENT_SEASON = new Date().getFullYear();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await params;

  try {
    // leagueId can be full key (449.l.123456) or just the key
    const leagueKey = decodeURIComponent(leagueId);

    const [league] = await db
      .select()
      .from(schema.leagues)
      .where(eq(schema.leagues.leagueKey, leagueKey))
      .limit(1);

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Cache historical data for 1 year, current season for 5 minutes
    const isHistorical = parseInt(league.season, 10) < CURRENT_SEASON;
    const maxAge = isHistorical ? ONE_YEAR : 300;

    return NextResponse.json(
      {
        league: {
          leagueKey: league.leagueKey,
          leagueId: league.leagueId,
          name: league.name,
          season: league.season,
          numTeams: league.numTeams,
          currentWeek: league.currentWeek,
          startWeek: league.startWeek,
          endWeek: league.endWeek,
          isFinished: league.isFinished,
          url: league.url,
          logoUrl: league.logoUrl,
        },
      },
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
