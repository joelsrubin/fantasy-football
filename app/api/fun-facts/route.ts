import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";

import { leagues, matchups, teams } from "@/db/schema";

export async function GET() {
  const margin = sql<number>`abs(${matchups.team1Points} - ${matchups.team2Points})`;

  // Fetch biggest blowout
  const [biggestBlowout] = await db
    .select({
      matchup: matchups,
      league: leagues,
    })
    .from(matchups)
    .innerJoin(leagues, eq(matchups.leagueId, leagues.id))
    .where(and(isNotNull(matchups.team1Points), isNotNull(matchups.team2Points)))
    .orderBy(desc(margin))
    .limit(1);

  const biggestBlowoutTeams = await db
    .select()
    .from(teams)
    .where(inArray(teams.id, [biggestBlowout.matchup.team1Id, biggestBlowout.matchup.team2Id]));

  // Determine winner and loser based on points
  const team1 = biggestBlowoutTeams.find((t) => t.id === biggestBlowout.matchup.team1Id);
  const team2 = biggestBlowoutTeams.find((t) => t.id === biggestBlowout.matchup.team2Id);
  const team1Points = biggestBlowout.matchup.team1Points ?? 0;
  const team2Points = biggestBlowout.matchup.team2Points ?? 0;

  const winner = team1Points > team2Points ? team1 : team2;
  const loser = team1Points > team2Points ? team2 : team1;
  const winnerPoints = team1Points > team2Points ? team1Points : team2Points;
  const loserPoints = team1Points > team2Points ? team2Points : team1Points;

  // Fetch closest matchup (both teams scored at least 1 point)
  const [closestMatchup] = await db
    .select({
      matchup: matchups,
      league: leagues,
    })
    .from(matchups)
    .innerJoin(leagues, eq(matchups.leagueId, leagues.id))
    .where(
      and(
        isNotNull(matchups.team1Points),
        isNotNull(matchups.team2Points),
        gt(matchups.team1Points, 0),
        gt(matchups.team2Points, 0),
      ),
    )
    .orderBy(asc(margin))
    .limit(1);

  const closestMatchupTeams = await db
    .select()
    .from(teams)
    .where(inArray(teams.id, [closestMatchup.matchup.team1Id, closestMatchup.matchup.team2Id]));

  // Determine winner and loser for closest matchup
  const closestTeam1 = closestMatchupTeams.find((t) => t.id === closestMatchup.matchup.team1Id);
  const closestTeam2 = closestMatchupTeams.find((t) => t.id === closestMatchup.matchup.team2Id);
  const closestTeam1Points = closestMatchup.matchup.team1Points ?? 0;
  const closestTeam2Points = closestMatchup.matchup.team2Points ?? 0;

  const closestWinner = closestTeam1Points > closestTeam2Points ? closestTeam1 : closestTeam2;
  const closestLoser = closestTeam1Points > closestTeam2Points ? closestTeam2 : closestTeam1;
  const closestWinnerPoints =
    closestTeam1Points > closestTeam2Points ? closestTeam1Points : closestTeam2Points;
  const closestLoserPoints =
    closestTeam1Points > closestTeam2Points ? closestTeam2Points : closestTeam1Points;

  const funFacts = [
    {
      type: "biggestBlowout",
      week: biggestBlowout.matchup.week,
      year: biggestBlowout.league.season,
      isPlayoff: biggestBlowout.matchup.isPlayoff,
      winner: {
        name: winner?.name ?? "Unknown",
        points: winnerPoints,
      },
      loser: {
        name: loser?.name ?? "Unknown",
        points: loserPoints,
      },
      margin: Math.abs(winnerPoints - loserPoints),
    },
    {
      type: "closestMatchup",
      week: closestMatchup.matchup.week,
      year: closestMatchup.league.season,
      isPlayoff: closestMatchup.matchup.isPlayoff,
      winner: {
        name: closestWinner?.name ?? "Unknown",
        points: closestWinnerPoints,
      },
      loser: {
        name: closestLoser?.name ?? "Unknown",
        points: closestLoserPoints,
      },
      margin: Math.abs(closestWinnerPoints - closestLoserPoints),
    },
  ];

  return NextResponse.json(funFacts);
}
