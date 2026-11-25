/**
 * Script to manually refresh Yahoo OAuth tokens
 * Run with: pnpm refresh-token
 */

import { config } from "dotenv";
import { getYahooAccessToken } from "@/lib/yahoo-auth";

config({ path: ".env.local" });

async function main() {
  console.log("\n🔄 Yahoo Token Refresh Script\n");

  try {
    const accessToken = await getYahooAccessToken();
    console.log("✅ Token refreshed and saved to Turso\n");

    const testResponse = await fetch(
      "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games?format=json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (testResponse.ok) {
      console.log("✅ Token is working! API call successful.\n");
    } else if (testResponse.status === 403) {
      const body = await testResponse.text();
      if (body.includes("not authorized to perform this action")) {
        console.error("⚠️ OAuth tokens are valid, but Yahoo has not approved this app for Fantasy Sports API access.");
        console.error("   Apply at: https://sports.yahoo.com/developer/access/");
        console.error("   Use your existing Client ID — do not create a new app.\n");
      } else {
        console.error(`⚠️ Token test failed: ${testResponse.status}`);
        console.error(body);
      }
    } else {
      console.error(`⚠️ Token test failed: ${testResponse.status}`);
      console.error(await testResponse.text());
    }
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    console.log("\n💡 If the refresh token is invalid, run 'pnpm setup-yahoo' to re-authenticate.\n");
    process.exit(1);
  }
}

main();
