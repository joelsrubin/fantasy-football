import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";

export interface RankingEntry {
  rank: number;
  name: string;
  nickname: string;
  guid: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  seasonsPlayed: number;
  championships: number;
  playoffAppearances: number;
}

// Cache for 5 minutes - data updates weekly via cron
export const revalidate = 300;

export async function GET() {
  try {
    // Join rankings with managers to get nickname/guid
    const rankingsWithManagers = await db
      .select({
        ranking: schema.rankings,
        manager: schema.managers,
      })
      .from(schema.rankings)
      .innerJoin(schema.managers, eq(schema.rankings.managerId, schema.managers.id))
      .orderBy(desc(schema.rankings.winPct), desc(schema.rankings.totalWins));

    // Format response with rank numbers
    const rankings: RankingEntry[] = rankingsWithManagers.map(({ ranking, manager }, index) => ({
      rank: index + 1,
      name: manager.nickname,
      nickname: manager.nickname,
      guid: manager.guid,
      wins: ranking.totalWins,
      losses: ranking.totalLosses,
      ties: ranking.totalTies,
      winPct: ranking.winPct,
      pointsFor: ranking.totalPointsFor,
      pointsAgainst: ranking.totalPointsAgainst,
      pointDiff: ranking.pointDiff,
      seasonsPlayed: ranking.seasonsPlayed,
      championships: ranking.championships,
      playoffAppearances: ranking.playoffAppearances,
    }));

    if (rankings.length === 0) {
      return NextResponse.json({
        rankings: [],
        error: "No rankings data available. Run 'pnpm seed-db' first.",
      });
    }

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json({ rankings: [], error: "Failed to fetch rankings" }, { status: 500 });
  }
}
