/**
 * Debug script to investigate a specific team's data
 * Run with: pnpm debug-team <teamKey|managerNickname|teamName>
 *
 * This helps debug championship/ranking issues by showing:
 * - Team data from the database
 * - League info and finish status
 * - Manager's ranking data
 * - All teams for that manager across seasons
 * - Matchup history (including playoffs)
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { and, eq, like, or } from "drizzle-orm";
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
  const searchTerm = process.argv[2];

  if (!searchTerm) {
    console.log("\n❌ Please provide a search term (teamKey, managerNickname, or teamName)");
    console.log("   Usage: pnpm debug-team <searchTerm>\n");
    console.log("   Examples:");
    console.log("     pnpm debug-team 449.l.730730.t.1");
    console.log('     pnpm debug-team "Joel"');
    console.log('     pnpm debug-team "Team Name"\n');
    process.exit(1);
  }

  console.log(`\n🔍 Debug Team Data: "${searchTerm}"\n`);
  console.log("═".repeat(70));

  const db = createDb();

  // Try to find teams matching the search term
  const teamsFound = await db
    .select({
      team: schema.teams,
      league: schema.leagues,
      manager: schema.managers,
    })
    .from(schema.teams)
    .innerJoin(schema.leagues, eq(schema.teams.leagueId, schema.leagues.id))
    .innerJoin(schema.managers, eq(schema.teams.managerId, schema.managers.id))
    .where(
      or(
        eq(schema.teams.teamKey, searchTerm),
        like(schema.managers.nickname, `%${searchTerm}%`),
        like(schema.teams.name, `%${searchTerm}%`),
      ),
    );

  if (teamsFound.length === 0) {
    console.log("\n❌ No teams found matching that search term.\n");
    process.exit(1);
  }

  // Get unique managers from results
  const managerIds = [...new Set(teamsFound.map((t) => t.manager.id))];

  console.log(`\n📊 Found ${teamsFound.length} team(s) for ${managerIds.length} manager(s)\n`);

  for (const managerId of managerIds) {
    const managerTeams = teamsFound.filter((t) => t.manager.id === managerId);
    const manager = managerTeams[0].manager;

    console.log("─".repeat(70));
    console.log(`\n👤 MANAGER: ${manager.nickname}`);
    console.log(`   GUID: ${manager.guid}`);
    console.log(`   DB ID: ${manager.id}`);

    // Get ranking data for this manager
    const [ranking] = await db
      .select()
      .from(schema.rankings)
      .where(eq(schema.rankings.managerId, managerId));

    if (ranking) {
      console.log(`\n📈 RANKING DATA:`);
      console.log(
        `   Total Record: ${ranking.totalWins}-${ranking.totalLosses}-${ranking.totalTies}`,
      );
      console.log(`   Win %: ${(ranking.winPct * 100).toFixed(2)}%`);
      console.log(`   Points For: ${ranking.totalPointsFor.toFixed(1)}`);
      console.log(`   Points Against: ${ranking.totalPointsAgainst.toFixed(1)}`);
      console.log(
        `   Point Diff: ${ranking.pointDiff >= 0 ? "+" : ""}${ranking.pointDiff.toFixed(1)}`,
      );
      console.log(`   Seasons Played: ${ranking.seasonsPlayed}`);
      console.log(`   Championships: ${ranking.championships} ⭐`);
      console.log(`   Playoff Appearances: ${ranking.playoffAppearances}`);
    }

    // Get ALL teams for this manager (not just search results)
    const allTeams = await db
      .select({
        team: schema.teams,
        league: schema.leagues,
      })
      .from(schema.teams)
      .innerJoin(schema.leagues, eq(schema.teams.leagueId, schema.leagues.id))
      .where(eq(schema.teams.managerId, managerId))
      .orderBy(schema.leagues.season);

    console.log(`\n🏈 ALL TEAMS (${allTeams.length} seasons):\n`);
    console.log(
      "   Season | League                    | Team                      | Record    | Rank | Playoff | Finished",
    );
    console.log(`   ${"─".repeat(100)}`);

    let championshipCount = 0;

    for (const { team, league } of allTeams) {
      const record = `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ""}`.padEnd(9);
      const rankStr = team.rank ? String(team.rank).padStart(4) : "   -";
      const playoffStr =
        team.isPlayoffTeam || (team.playoffSeed && team.playoffSeed > 0) ? "Yes" : "No ";
      const finishedStr = league.isFinished ? "Yes" : "No ";
      const isChampion = team.rank === 1 && league.isFinished;

      if (team.rank === 1) {
        championshipCount++;
      }

      const champMarker = isChampion
        ? " 🏆"
        : team.rank === 1
          ? " ⚠️ (rank=1 but league not finished?)"
          : "";

      console.log(
        `   ${league.season}   | ${league.name.substring(0, 25).padEnd(25)} | ${team.name.substring(0, 25).padEnd(25)} | ${record} | ${rankStr} | ${playoffStr}     | ${finishedStr}${champMarker}`,
      );
    }

    console.log(`\n   Championship count from rank=1: ${championshipCount}`);

    // Check for any rank=1 teams in unfinished leagues
    const rank1InUnfinished = allTeams.filter(
      ({ team, league }) => team.rank === 1 && !league.isFinished,
    );

    if (rank1InUnfinished.length > 0) {
      console.log(
        `\n   ⚠️  WARNING: ${rank1InUnfinished.length} team(s) have rank=1 in UNFINISHED leagues:`,
      );
      for (const { team, league } of rank1InUnfinished) {
        console.log(`      - ${league.season} ${league.name}: ${team.name}`);
      }
    }

    // Show playoff matchup details for teams with rank=1
    const rank1Teams = allTeams.filter(({ team }) => team.rank === 1);

    if (rank1Teams.length > 0) {
      console.log(`\n📋 PLAYOFF MATCHUP DETAILS FOR RANK=1 TEAMS:\n`);

      for (const { team, league } of rank1Teams) {
        console.log(`   ${league.season} - ${team.name} (rank=${team.rank}):`);

        // Get playoff matchups for this team
        const playoffMatchups = await db
          .select({
            matchup: schema.matchups,
            team1: schema.teams,
            team2: schema.teams,
          })
          .from(schema.matchups)
          .innerJoin(schema.teams, eq(schema.teams.id, schema.matchups.team1Id))
          .where(
            and(
              eq(schema.matchups.leagueId, league.id),
              eq(schema.matchups.isPlayoff, true),
              or(eq(schema.matchups.team1Id, team.id), eq(schema.matchups.team2Id, team.id)),
            ),
          );

        if (playoffMatchups.length === 0) {
          console.log(`      ⚠️  No playoff matchups found in database!`);
        } else {
          // Get team2 names separately since we can't easily join twice
          for (const pm of playoffMatchups) {
            const [team2Info] = await db
              .select()
              .from(schema.teams)
              .where(eq(schema.teams.id, pm.matchup.team2Id));

            const t1Name = pm.team1.name;
            const t2Name = team2Info?.name || "Unknown";
            const t1Points = pm.matchup.team1Points?.toFixed(2) || "0";
            const t2Points = pm.matchup.team2Points?.toFixed(2) || "0";

            let winnerName = "Tie";
            if (pm.matchup.winnerId === pm.matchup.team1Id) {
              winnerName = t1Name;
            } else if (pm.matchup.winnerId === pm.matchup.team2Id) {
              winnerName = t2Name;
            }

            console.log(
              `      Week ${pm.matchup.week}: ${t1Name} (${t1Points}) vs ${t2Name} (${t2Points}) - Winner: ${winnerName}`,
            );
          }
        }
        console.log("");
      }
    }

    // Show what Yahoo API returns for rank
    console.log(`\n💡 NOTES:`);
    console.log(`   - Championship is counted when team.rank = 1 AND league.isFinished = true`);
    console.log(`   - The 'rank' field comes from Yahoo API's team_standings.rank`);
    console.log(
      `   - If rank=1 in an unfinished league, it may be current standings rank, not final`,
    );
  }

  console.log(`\n${"═".repeat(70)}\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
