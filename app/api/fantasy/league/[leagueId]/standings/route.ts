import { asc, eq } from "drizzle-orm";
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
    const leagueKey = decodeURIComponent(leagueId);

    // First get the league to check season and get its ID
    const [league] = await db
      .select()
      .from(schema.leagues)
      .where(eq(schema.leagues.leagueKey, leagueKey))
      .limit(1);

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Get teams with manager info for this league
    const teamsWithManagers = await db
      .select({
        team: schema.teams,
        manager: schema.managers,
      })
      .from(schema.teams)
      .innerJoin(schema.managers, eq(schema.teams.managerId, schema.managers.id))
      .where(eq(schema.teams.leagueId, league.id))
      .orderBy(asc(schema.teams.rank));

    // Format standings response
    const standings = teamsWithManagers.map(({ team, manager }) => ({
      teamKey: team.teamKey,
      teamId: team.teamId,
      name: team.name,
      logoUrl: team.logoUrl,
      url: team.url,
      manager: {
        guid: manager.guid,
        nickname: manager.nickname,
        imageUrl: manager.imageUrl,
      },
      standings: {
        rank: team.rank,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        winPct: team.winPct,
        pointsFor: team.pointsFor,
        pointsAgainst: team.pointsAgainst,
        playoffSeed: team.playoffSeed,
      },
    }));

    // Cache historical data for 1 year, current season for 2 minutes
    const isHistorical = parseInt(league.season, 10) < CURRENT_SEASON;
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
