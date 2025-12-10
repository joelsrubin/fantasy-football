/**
 * Script to get the current week from Yahoo Fantasy API
 * Run with: pnpm tsx scripts/get-current-week.ts
 */

import { config } from "dotenv";
import { getYahooAccessToken } from "@/lib/yahoo-auth";

config({ path: ".env.local" });

async function main() {
  console.log("\n🏈 Getting Current Week from Yahoo Fantasy API\n");

  try {
    // Get access token
    const accessToken = await getYahooAccessToken();
    console.log("✅ Got access token");

    // Fetch user's NFL leagues
    const response = await fetch(
      "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=nfl/leagues?format=json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", response.status);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();

    // Parse the response to find leagues
    const users = data.fantasy_content?.users;
    const user = users?.["0"]?.user;

    if (!user) {
      console.log("No user data found in response");
      process.exit(1);
    }

    const games = user[1]?.games;
    const gamesCount = games?.count || 0;

    if (gamesCount === 0) {
      console.log("No NFL fantasy games found for this account.\n");
      process.exit(0);
    }

    console.log("🏈 Current Week Information:\n");
    console.log("─".repeat(50));

    let foundCurrentSeason = false;

    for (let i = 0; i < gamesCount; i++) {
      const game = games[i.toString()]?.game;
      if (!game) continue;

      const gameInfo = game[0];
      const leagues = game[1]?.leagues;
      const leaguesCount = leagues?.count || 0;

      // Focus on the most recent season
      if (!foundCurrentSeason && gameInfo.season === "2025") {
        foundCurrentSeason = true;
        console.log(`\n📅 ${gameInfo.season} Season`);

        for (let j = 0; j < leaguesCount; j++) {
          const league = leagues[j.toString()]?.league?.[0];
          if (!league) continue;

          console.log(`\n   League: ${league.name}`);
          console.log(`   Current Week: ${league.current_week}`);
          console.log(`   League Key: ${league.league_key}`);
        }
      }
    }

    if (!foundCurrentSeason) {
      console.log("No 2024 season leagues found. Checking all seasons...\n");

      for (let i = 0; i < gamesCount; i++) {
        const game = games[i.toString()]?.game;
        if (!game) continue;

        const gameInfo = game[0];
        const leagues = game[1]?.leagues;
        const leaguesCount = leagues?.count || 0;

        console.log(`\n📅 ${gameInfo.season} Season`);

        for (let j = 0; j < leaguesCount; j++) {
          const league = leagues[j.toString()]?.league?.[0];
          if (!league) continue;

          console.log(`\n   League: ${league.name}`);
          console.log(`   Current Week: ${league.current_week}`);
        }
      }
    }

    console.log(`\n${"─".repeat(50)}`);
    console.log("\n✅ Successfully retrieved current week information!\n");
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
