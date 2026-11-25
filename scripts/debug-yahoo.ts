/**
 * Debug script to verify Yahoo API access and find your leagues
 * Run with: pnpm run debug-yahoo
 */

import { config } from "dotenv";
import { getYahooAccessToken } from "@/lib/yahoo-auth";

config({ path: ".env.local" });

async function main() {
  console.log("\n🔍 Debugging Yahoo API Access\n");

  let accessToken: string;
  try {
    accessToken = await getYahooAccessToken();
    console.log("✅ Tokens found in Turso\n");
  } catch (error) {
    console.error("❌ Failed to load tokens:", error);
    console.error("\nRun 'pnpm setup-yahoo' first.\n");
    process.exit(1);
  }

  console.log("📡 Fetching your Yahoo Fantasy leagues...\n");

  try {
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

      if (response.status === 401) {
        console.log("\n💡 Token may be expired. Try running 'pnpm setup-yahoo' again.\n");
      }
      process.exit(1);
    }

    const data = await response.json();

    const users = data.fantasy_content?.users;
    const user = users?.["0"]?.user;

    if (!user) {
      console.log("No user data found in response");
      console.log(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log("👤 Logged in as Yahoo user\n");

    const games = user[1]?.games;
    const gamesCount = games?.count || 0;

    if (gamesCount === 0) {
      console.log("No NFL fantasy games found for this account.\n");
      process.exit(0);
    }

    console.log("🏈 Your NFL Fantasy Leagues:\n");
    console.log("─".repeat(60));

    for (let i = 0; i < gamesCount; i++) {
      const game = games[i.toString()]?.game;
      if (!game) continue;

      const gameInfo = game[0];
      const leagues = game[1]?.leagues;
      const leaguesCount = leagues?.count || 0;

      console.log(`\n📅 ${gameInfo.season} Season (Game Key: ${gameInfo.game_key})`);

      for (let j = 0; j < leaguesCount; j++) {
        const league = leagues[j.toString()]?.league?.[0];
        if (!league) continue;

        console.log(`\n   League: ${league.name}`);
        console.log(`   League Key: ${league.league_key}`);
        console.log(`   League ID: ${league.league_id}`);
        console.log(`   Teams: ${league.num_teams}`);
        console.log(`   Current Week: ${league.current_week}`);
        console.log(`   URL: ${league.url}`);
      }
    }

    console.log(`\n${"─".repeat(60)}`);
    console.log(
      "\n💡 Use the League Key (e.g., '449.l.123456') or just the League ID in the app.\n",
    );
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
