import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { buildH2HMatrix, type H2HMatchupInput } from "@/lib/h2h";

export const revalidate = 300;

export async function GET() {
  try {
    const rankingsWithManagers = await db
      .select({
        ranking: schema.rankings,
        manager: schema.managers,
      })
      .from(schema.rankings)
      .innerJoin(schema.managers, eq(schema.rankings.managerId, schema.managers.id))
      .orderBy(desc(schema.rankings.winPct), desc(schema.rankings.totalWins));

    const managers = rankingsWithManagers.map(({ manager }) => ({
      id: manager.id,
      guid: manager.guid,
      nickname: manager.nickname,
    }));

    const team1 = alias(schema.teams, "h2h_team1");
    const team2 = alias(schema.teams, "h2h_team2");

    const rows = await db
      .select({
        team1Id: schema.matchups.team1Id,
        team2Id: schema.matchups.team2Id,
        winnerId: schema.matchups.winnerId,
        isTie: schema.matchups.isTie,
        team1ManagerId: team1.managerId,
        team2ManagerId: team2.managerId,
      })
      .from(schema.matchups)
      .innerJoin(team1, eq(schema.matchups.team1Id, team1.id))
      .innerJoin(team2, eq(schema.matchups.team2Id, team2.id));

    const matchups: H2HMatchupInput[] = rows.map((row) => {
      let winnerManagerId: number | null = null;
      if (row.winnerId === row.team1Id) {
        winnerManagerId = row.team1ManagerId;
      } else if (row.winnerId === row.team2Id) {
        winnerManagerId = row.team2ManagerId;
      }

      return {
        team1ManagerId: row.team1ManagerId,
        team2ManagerId: row.team2ManagerId,
        winnerManagerId,
        isTie: Boolean(row.isTie),
      };
    });

    const matrix = buildH2HMatrix(managers, matchups);

    return NextResponse.json(
      { matrix },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching head-to-head:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch head-to-head" },
      { status: 500 },
    );
  }
}
