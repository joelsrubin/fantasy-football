import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

config({ path: ".env.local" });
async function main() {
  console.log("🌱 Seeding weekly rankings...");

  // Initialize the database client
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing required environment variables");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  try {
    // Get all leagues
    const allLeagues = await db.select().from(schema.leagues);
    console.log(`Found ${allLeagues.length} leagues`);

    for (const league of allLeagues) {
      console.log(`\nProcessing league: ${league.name} (${league.id})`);

      // Get all teams in this league
      const teams = await db
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.leagueId, league.id));

      if (teams.length === 0) {
        console.log("  No teams found, skipping...");
        continue;
      }

      console.log(`  Found ${teams.length} teams`);

      // Get all matchups for this league
      const matchups = await db
        .select()
        .from(schema.matchups)
        .where(eq(schema.matchups.leagueId, league.id));

      if (matchups.length === 0) {
        console.log("  No matchups found, skipping...");
        continue;
      }

      const weeks = [...new Set(matchups.map((m) => m.week))].sort((a, b) => a - b);
      console.log(`  Found matchups for weeks: ${weeks.join(", ")}`);

      // For each week, calculate rankings
      for (const week of weeks) {
        console.log(`  Calculating rankings for week ${week}...`);

        // Get all matchups up to this week
        const weekMatchups = matchups.filter((m) => m.week <= week);

        // Initialize team stats
        const teamStats = new Map<
          number,
          {
            wins: number;
            losses: number;
            ties: number;
            pointsFor: number;
            pointsAgainst: number;
          }
        >();

        // Initialize all teams with 0 stats
        for (const team of teams) {
          teamStats.set(team.id, {
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          });
        }

        // Calculate stats from matchups
        for (const matchup of weekMatchups) {
          const team1Stats = teamStats.get(matchup.team1Id)!;
          const team2Stats = teamStats.get(matchup.team2Id)!;

          if (matchup.team1Points !== null && matchup.team2Points !== null) {
            team1Stats.pointsFor += matchup.team1Points;
            team1Stats.pointsAgainst += matchup.team2Points;
            team2Stats.pointsFor += matchup.team2Points;
            team2Stats.pointsAgainst += matchup.team1Points;

            if (matchup.isTie) {
              team1Stats.ties += 1;
              team2Stats.ties += 1;
            } else if (matchup.winnerId === matchup.team1Id) {
              team1Stats.wins += 1;
              team2Stats.losses += 1;
            } else if (matchup.winnerId === matchup.team2Id) {
              team2Stats.wins += 1;
              team1Stats.losses += 1;
            }
          }
        }

        // Calculate rankings
        const rankingData = teams.map((team) => {
          const stats = teamStats.get(team.id)!;
          const totalGames = stats.wins + stats.losses + stats.ties;
          const winPct = totalGames > 0 ? stats.wins / totalGames : 0;

          return {
            teamId: team.id,
            managerId: team.managerId,
            ...stats,
            winPct,
          };
        });

        // Sort by win percentage, then wins, then point differential
        rankingData.sort((a, b) => {
          if (a.winPct !== b.winPct) return b.winPct - a.winPct;
          if (a.wins !== b.wins) return b.wins - a.wins;
          return b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
        });

        // Insert weekly rankings
        for (let i = 0; i < rankingData.length; i++) {
          const rank = i + 1;
          const data = rankingData[i];

          await db
            .insert(schema.weeklyRankings)
            .values({
              leagueId: league.id,
              managerId: data.managerId,
              week,
              rank,
              wins: data.wins,
              losses: data.losses,
              ties: data.ties,
              winPct: data.winPct,
              pointsFor: data.pointsFor,
              pointsAgainst: data.pointsAgainst,
            })
            .onConflictDoUpdate({
              target: [
                schema.weeklyRankings.leagueId,
                schema.weeklyRankings.managerId,
                schema.weeklyRankings.week,
              ],
              set: {
                rank,
                wins: data.wins,
                losses: data.losses,
                ties: data.ties,
                winPct: data.winPct,
                pointsFor: data.pointsFor,
                pointsAgainst: data.pointsAgainst,
              },
            });

          console.log(
            `    Rank ${rank}: Team ${data.teamId} (${data.wins}-${data.losses}-${data.ties})`,
          );
        }
      }
    }

    console.log("\n✅ Weekly rankings seeded successfully!");
  } catch (error) {
    console.error("Error seeding weekly rankings:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
