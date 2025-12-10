import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";

export interface WeeklyRankingData {
  week: number;
  rankings: {
    managerId: number;
    managerName: string;
    rank: number;
    wins: number;
    losses: number;
    ties: number;
    winPct: number;
    pointsFor: number;
    pointsAgainst: number;
  }[];
}

// Cache for 5 minutes - data updates weekly
export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId");
    const leagueKey = searchParams.get("leagueKey");

    if (!leagueId && !leagueKey) {
      return NextResponse.json(
        { error: "leagueId or leagueKey parameter is required" },
        { status: 400 },
      );
    }

    let dbLeagueId: number;

    if (leagueKey) {
      // Find league by league key
      const league = await db
        .select({ id: schema.leagues.id })
        .from(schema.leagues)
        .where(eq(schema.leagues.leagueKey, leagueKey))
        .limit(1);

      if (!league[0]) {
        return NextResponse.json({ error: "League not found" }, { status: 404 });
      }

      dbLeagueId = league[0].id;
    } else {
      dbLeagueId = parseInt(leagueId!, 10);
    }

    // Get all weekly rankings for this league, ordered by week
    const weeklyRankings = await db
      .select({
        week: schema.weeklyRankings.week,
        managerId: schema.weeklyRankings.managerId,
        managerName: schema.managers.nickname,
        rank: schema.weeklyRankings.rank,
        wins: schema.weeklyRankings.wins,
        losses: schema.weeklyRankings.losses,
        ties: schema.weeklyRankings.ties,
        winPct: schema.weeklyRankings.winPct,
        pointsFor: schema.weeklyRankings.pointsFor,
        pointsAgainst: schema.weeklyRankings.pointsAgainst,
      })
      .from(schema.weeklyRankings)
      .innerJoin(schema.managers, eq(schema.weeklyRankings.managerId, schema.managers.id))
      .where(eq(schema.weeklyRankings.leagueId, dbLeagueId))
      .orderBy(schema.weeklyRankings.week, schema.weeklyRankings.rank);

    // Group by week
    const weekMap = new Map<number, WeeklyRankingData>();

    for (const ranking of weeklyRankings) {
      if (!weekMap.has(ranking.week)) {
        weekMap.set(ranking.week, {
          week: ranking.week,
          rankings: [],
        });
      }

      weekMap.get(ranking.week)!.rankings.push({
        managerId: ranking.managerId,
        managerName: ranking.managerName,
        rank: ranking.rank,
        wins: ranking.wins,
        losses: ranking.losses,
        ties: ranking.ties,
        winPct: ranking.winPct,
        pointsFor: ranking.pointsFor,
        pointsAgainst: ranking.pointsAgainst,
      });
    }

    // Convert to array and sort by week
    const result = Array.from(weekMap.values()).sort((a, b) => a.week - b.week);

    if (result.length === 0) {
      return NextResponse.json({
        weeklyRankings: [],
        error: "No weekly ranking data available for this league. Run the cron job first.",
      });
    }

    return NextResponse.json({ weeklyRankings: result });
  } catch (error) {
    console.error("Error fetching weekly rankings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch weekly rankings" },
      { status: 500 },
    );
  }
}
