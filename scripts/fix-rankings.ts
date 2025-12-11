/**
 * Fix Rankings Script
 * Run with: pnpm fix-rankings
 *
 * Recomputes all manager rankings without re-fetching Yahoo data.
 * Use this after fixing bugs in the ranking computation logic.
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

config({ path: ".env.local" });

function createDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_DATABASE_URL not set");

  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

async function main() {
  console.log("\n🔧 Fix Rankings Script\n");
  console.log("═".repeat(50));

  const db = createDb();
  console.log("✅ Connected to database\n");

  // Show current state before fix
  console.log("📊 Current rankings with championships:\n");

  const currentRankings = await db
    .select({
      nickname: schema.managers.nickname,
      championships: schema.rankings.championships,
    })
    .from(schema.rankings)
    .innerJoin(schema.managers, eq(schema.rankings.managerId, schema.managers.id))
    .orderBy(schema.rankings.championships);

  const managersWithChampionships = currentRankings.filter((r) => r.championships > 0);
  for (const r of managersWithChampionships) {
    console.log(`   ${r.nickname}: ${r.championships} championship(s)`);
  }
  console.log("");

  // Show what SHOULD be championships (rank=1 AND league finished)
  console.log("🔍 Checking rank=1 teams by league finish status:\n");

  const rank1Teams = await db
    .select({
      managerNickname: schema.managers.nickname,
      teamName: schema.teams.name,
      season: schema.leagues.season,
      leagueName: schema.leagues.name,
      isFinished: schema.leagues.isFinished,
    })
    .from(schema.teams)
    .innerJoin(schema.managers, eq(schema.teams.managerId, schema.managers.id))
    .innerJoin(schema.leagues, eq(schema.teams.leagueId, schema.leagues.id))
    .where(eq(schema.teams.rank, 1));

  const finishedChamps = rank1Teams.filter((t) => t.isFinished);
  const unfinishedChamps = rank1Teams.filter((t) => !t.isFinished);

  console.log(`   ✅ Finished leagues with rank=1 (valid championships): ${finishedChamps.length}`);
  for (const t of finishedChamps) {
    console.log(`      - ${t.season} ${t.leagueName}: ${t.managerNickname}`);
  }

  if (unfinishedChamps.length > 0) {
    console.log(
      `\n   ⚠️  Unfinished leagues with rank=1 (should NOT count): ${unfinishedChamps.length}`,
    );
    for (const t of unfinishedChamps) {
      console.log(`      - ${t.season} ${t.leagueName}: ${t.managerNickname} (${t.teamName})`);
    }
  }

  console.log("\n📈 Recomputing rankings...\n");

  // Get basic stats from teams table, joining with leagues to check isFinished for championships
  const managerStats = await db
    .select({
      managerId: schema.managers.id,
      totalWins: sql<number>`SUM(${schema.teams.wins})`,
      totalLosses: sql<number>`SUM(${schema.teams.losses})`,
      totalTies: sql<number>`SUM(${schema.teams.ties})`,
      totalPointsFor: sql<number>`SUM(${schema.teams.pointsFor})`,
      totalPointsAgainst: sql<number>`SUM(${schema.teams.pointsAgainst})`,
      seasonsPlayed: sql<number>`COUNT(DISTINCT ${schema.teams.leagueId})`,
      // Only count championships when league is finished
      championships: sql<number>`SUM(CASE WHEN ${schema.teams.rank} = 1 AND ${schema.leagues.isFinished} = 1 THEN 1 ELSE 0 END)`,
      // Count playoff appearances from both isPlayoffTeam field AND playoffSeed
      playoffAppearances: sql<number>`SUM(CASE WHEN ${schema.teams.isPlayoffTeam} = 1 OR ${schema.teams.playoffSeed} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(schema.managers)
    .innerJoin(schema.teams, eq(schema.teams.managerId, schema.managers.id))
    .innerJoin(schema.leagues, eq(schema.teams.leagueId, schema.leagues.id))
    .groupBy(schema.managers.id);

  // Also count playoff appearances from matchup data (most reliable source)
  const playoffAppearancesFromMatchups = await db
    .select({
      managerId: schema.teams.managerId,
      playoffAppearances: sql<number>`COUNT(DISTINCT ${schema.teams.leagueId})`,
    })
    .from(schema.matchups)
    .innerJoin(
      schema.teams,
      sql`(${schema.teams.id} = ${schema.matchups.team1Id} OR ${schema.teams.id} = ${schema.matchups.team2Id})`,
    )
    .where(eq(schema.matchups.isPlayoff, true))
    .groupBy(schema.teams.managerId);

  // Create a map for quick lookup
  const playoffAppearancesMap = new Map<number, number>();
  for (const row of playoffAppearancesFromMatchups) {
    playoffAppearancesMap.set(row.managerId, row.playoffAppearances);
  }

  let updated = 0;
  const changes: { nickname: string; oldChamps: number; newChamps: number }[] = [];

  for (const stat of managerStats) {
    const totalGames = stat.totalWins + stat.totalLosses + stat.totalTies;
    const winPct = totalGames > 0 ? stat.totalWins / totalGames : 0;
    const pointDiff = stat.totalPointsFor - stat.totalPointsAgainst;

    // Use the higher value between the two sources for playoff appearances
    const playoffAppearancesFromTeams = stat.playoffAppearances || 0;
    const playoffAppearancesFromGames = playoffAppearancesMap.get(stat.managerId) || 0;
    const playoffAppearances = Math.max(playoffAppearancesFromTeams, playoffAppearancesFromGames);

    // Get current ranking to track changes
    const [currentRanking] = await db
      .select()
      .from(schema.rankings)
      .where(eq(schema.rankings.managerId, stat.managerId));

    const [manager] = await db
      .select()
      .from(schema.managers)
      .where(eq(schema.managers.id, stat.managerId));

    if (currentRanking && currentRanking.championships !== stat.championships) {
      changes.push({
        nickname: manager.nickname,
        oldChamps: currentRanking.championships,
        newChamps: stat.championships,
      });
    }

    await db
      .insert(schema.rankings)
      .values({
        managerId: stat.managerId,
        totalWins: stat.totalWins,
        totalLosses: stat.totalLosses,
        totalTies: stat.totalTies,
        winPct,
        totalPointsFor: stat.totalPointsFor,
        totalPointsAgainst: stat.totalPointsAgainst,
        pointDiff,
        seasonsPlayed: stat.seasonsPlayed,
        championships: stat.championships,
        playoffAppearances,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.rankings.managerId,
        set: {
          totalWins: stat.totalWins,
          totalLosses: stat.totalLosses,
          totalTies: stat.totalTies,
          winPct,
          totalPointsFor: stat.totalPointsFor,
          totalPointsAgainst: stat.totalPointsAgainst,
          pointDiff,
          seasonsPlayed: stat.seasonsPlayed,
          championships: stat.championships,
          playoffAppearances,
          updatedAt: new Date().toISOString(),
        },
      });

    updated++;
  }

  console.log(`✅ Updated rankings for ${updated} managers\n`);

  if (changes.length > 0) {
    console.log("📝 Championship changes:\n");
    for (const change of changes) {
      console.log(`   ${change.nickname}: ${change.oldChamps} → ${change.newChamps}`);
    }
    console.log("");
  } else {
    console.log("   No championship changes detected.\n");
  }

  console.log("═".repeat(50));
  console.log("✅ Done!\n");
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
