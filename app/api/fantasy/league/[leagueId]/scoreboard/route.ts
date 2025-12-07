import { and, asc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";

const ONE_YEAR = 31536000;
const CURRENT_SEASON = new Date().getFullYear();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await params;

  try {
    const leagueKey = decodeURIComponent(leagueId);

    // Get the league
    const [league] = await db
      .select()
      .from(schema.leagues)
      .where(eq(schema.leagues.leagueKey, leagueKey))
      .limit(1);

    if (!league) {
      console.log(`League not found: ${leagueKey}`);
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Get week from query params (default to current week)
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");
    const week = weekParam ? parseInt(weekParam, 10) : league.currentWeek || 1;

    // Get all matchups for this league and week
    const matchupsData = await db
      .select()
      .from(schema.matchups)
      .where(and(eq(schema.matchups.leagueId, league.id), eq(schema.matchups.week, week)))
      .orderBy(asc(schema.matchups.id));

    if (matchupsData.length === 0) {
      // No matchups in DB - return empty array
      return NextResponse.json(
        { matchups: [], week, leagueKey: league.leagueKey },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }

    // Collect all team IDs we need
    const teamIds = new Set<number>();
    for (const m of matchupsData) {
      teamIds.add(m.team1Id);
      teamIds.add(m.team2Id);
    }

    // Fetch all teams at once
    const teamsData = await db
      .select()
      .from(schema.teams)
      .where(inArray(schema.teams.id, Array.from(teamIds)));

    const teamsMap = new Map(teamsData.map((t) => [t.id, t]));

    // Collect all manager IDs
    const managerIds = new Set<number>();
    for (const team of teamsData) {
      managerIds.add(team.managerId);
    }

    // Fetch all managers at once
    const managersData = await db
      .select()
      .from(schema.managers)
      .where(inArray(schema.managers.id, Array.from(managerIds)));

    const managersMap = new Map(managersData.map((m) => [m.id, m]));

    // Format matchups response
    const matchups = matchupsData.map((matchup) => {
      const team1 = teamsMap.get(matchup.team1Id);
      const team2 = teamsMap.get(matchup.team2Id);
      const manager1 = team1 ? managersMap.get(team1.managerId) : null;
      const manager2 = team2 ? managersMap.get(team2.managerId) : null;

      return {
        week: matchup.week,
        isPlayoff: matchup.isPlayoff,
        isTie: matchup.isTie,
        teams: [
          team1
            ? {
                teamKey: team1.teamKey,
                teamId: team1.teamId,
                name: team1.name,
                logoUrl: team1.logoUrl,
                points: matchup.team1Points,
                isWinner: matchup.winnerId === team1.id,
                manager: manager1
                  ? {
                      guid: manager1.guid,
                      nickname: manager1.nickname,
                      imageUrl: manager1.imageUrl,
                    }
                  : null,
              }
            : null,
          team2
            ? {
                teamKey: team2.teamKey,
                teamId: team2.teamId,
                name: team2.name,
                logoUrl: team2.logoUrl,
                points: matchup.team2Points,
                isWinner: matchup.winnerId === team2.id,
                manager: manager2
                  ? {
                      guid: manager2.guid,
                      nickname: manager2.nickname,
                      imageUrl: manager2.imageUrl,
                    }
                  : null,
              }
            : null,
        ].filter(Boolean),
      };
    });

    // Cache historical data for 1 year, current season for 1 minute
    const isHistorical = parseInt(league.season, 10) < CURRENT_SEASON;
    const maxAge = isHistorical ? ONE_YEAR : 60;

    return NextResponse.json(
      { matchups, week, leagueKey: league.leagueKey },
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
