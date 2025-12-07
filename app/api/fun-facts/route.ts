import { and, asc, desc, inArray, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { matchups } from "@/db/schema";

export async function GET() {
  const margin = sql<number>`abs(${schema.matchups.team1Points} - ${schema.matchups.team2Points})`;
  const [closestMatchup] = await db
    .select()
    .from(schema.matchups)
    .where(and(isNotNull(schema.matchups.team1Points), isNotNull(schema.matchups.team2Points)))
    .orderBy(asc(margin))
    .limit(1);
  console.log({ closestMatchup });

  // we have matchhup data, we need to return the both team details separately
  const closestMatchupTeams = await db
    .select()
    .from(schema.teams)
    .where(inArray(schema.teams.id, [closestMatchup.team1Id, closestMatchup.team2Id]));
  console.log({ closestMatchupTeams });

  const [biggestBlowout] = await db
    .select()
    .from(matchups)
    .where(and(isNotNull(schema.matchups.team1Points), isNotNull(schema.matchups.team2Points)))
    .orderBy(desc(margin))
    .limit(1);

  console.log({ biggestBlowout });

  const biggestBlowoutTeams = await db
    .select()
    .from(schema.teams)
    .where(inArray(schema.teams.id, [biggestBlowout.team1Id, biggestBlowout.team2Id]));
  console.log({ biggestBlowoutTeams });

  const funfFactDetails = {
    closestMatchup: {
      week: closestMatchup.week,
      isPlayoff: closestMatchup.isPlayoff,
      teams: closestMatchupTeams,
      winningPoints: closestMatchup.team1Points,
      losingPoints: closestMatchup.team2Points,
      winningTeam: closestMatchupTeams.find((t) => t.id === closestMatchup.winnerId)?.name,
      losingTeam: closestMatchupTeams.find((t) => t.id !== closestMatchup.winnerId)?.name,
    },
    biggestBlowout: {
      week: biggestBlowout.week,
      isPlayoff: biggestBlowout.isPlayoff,
      isTie: biggestBlowout.isTie,
      teams: biggestBlowoutTeams,
      winningPoints: biggestBlowout.team1Points,
      losingPoints: biggestBlowout.team2Points,
      winningTeam: biggestBlowoutTeams.find((t) => t.id === biggestBlowout.winnerId)?.name,
      losingTeam: biggestBlowoutTeams.find((t) => t.id !== biggestBlowout.winnerId)?.name,
    },
  };

  return NextResponse.json(funfFactDetails);
}
