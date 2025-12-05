/**
 * Debug script to see raw standings data structure
 * Run with: pnpm run debug-standings
 */

import { config } from "dotenv";
import { createClient } from "redis";

config({ path: ".env.local" });

async function main() {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    console.error("❌ REDIS_URL not set in .env.local\n");
    process.exit(1);
  }

  // Load tokens from Redis
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();
  const tokensData = await redis.get("yahoo-tokens");
  await redis.disconnect();

  if (!tokensData) {
    console.error("❌ No tokens found in Redis. Run 'pnpm run setup-yahoo' first.\n");
    process.exit(1);
  }

  const tokens = JSON.parse(tokensData);

  console.log("\n🔍 Fetching standings for 461.l.66782...\n");

  const response = await fetch(
    "https://fantasysports.yahooapis.com/fantasy/v2/league/461.l.66782/standings?format=json",
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    console.error("API Error:", await response.text());
    process.exit(1);
  }

  const data = await response.json();

  // Pretty print the full response
  console.log("Full API Response:\n");
  console.log(JSON.stringify(data, null, 2));

  // Try to extract team data to see structure
  const fantasy = data.fantasy_content;
  const league = fantasy?.league;

  console.log("\n\n--- League structure ---");
  console.log("league array length:", league?.length);

  if (league?.[1]) {
    console.log("\nleague[1] keys:", Object.keys(league[1]));

    const standingsData = league[1]?.standings;
    console.log("\nstandings structure:", standingsData);

    if (standingsData) {
      const teams = standingsData[0]?.teams;
      console.log("\nteams count:", teams?.count);

      // Look at first team structure
      const firstTeam = teams?.["0"]?.team;
      console.log("\n--- First team structure ---");
      console.log("firstTeam array length:", firstTeam?.length);

      if (firstTeam) {
        for (let i = 0; i < firstTeam.length; i++) {
          console.log(`\nfirstTeam[${i}]:`, JSON.stringify(firstTeam[i], null, 2));
        }
      }
    }
  }
}

main().catch(console.error);
