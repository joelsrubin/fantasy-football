/**
 * Script to manually refresh Yahoo OAuth tokens
 * Run with: pnpm refresh-token
 *
 * This script will:
 * 1. Load the current tokens from Redis
 * 2. Use the refresh token to get a new access token
 * 3. Save the new tokens back to Redis
 */

import { config } from "dotenv";
import { createClient } from "redis";

config({ path: ".env.local" });

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_KEY = "yahoo-tokens";

async function main() {
  console.log("\n🔄 Yahoo Token Refresh Script\n");

  // Validate environment
  const REDIS_URL = process.env.REDIS_URL;
  const CLIENT_ID = process.env.YAHOO_CLIENT_ID;
  const CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;

  if (!REDIS_URL) {
    console.error("❌ REDIS_URL not set in .env.local\n");
    process.exit(1);
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ YAHOO_CLIENT_ID or YAHOO_CLIENT_SECRET not set in .env.local\n");
    process.exit(1);
  }

  // Connect to Redis
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  // Load current tokens
  console.log("📥 Loading current tokens from Redis...");
  const data = await redis.get(TOKEN_KEY);

  if (!data) {
    console.error("❌ No tokens found in Redis. Run 'pnpm setup-yahoo' first.\n");
    await redis.quit();
    process.exit(1);
  }

  const currentTokens: TokenData = JSON.parse(data);

  console.log("✅ Current tokens loaded");
  console.log(`   Access token expires: ${new Date(currentTokens.expiresAt).toLocaleString()}`);

  const isExpired = Date.now() > currentTokens.expiresAt;
  const expiresIn = Math.round((currentTokens.expiresAt - Date.now()) / 1000 / 60);

  if (isExpired) {
    console.log(`   Status: EXPIRED ⚠️\n`);
  } else {
    console.log(`   Status: Valid (expires in ${expiresIn} minutes)\n`);
  }

  // Refresh the token
  console.log("🔄 Refreshing access token...");

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentTokens.refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Token refresh failed: ${response.status}`);
    console.error(errorText);
    console.log(
      "\n💡 If the refresh token is invalid, run 'pnpm setup-yahoo' to re-authenticate.\n",
    );
    await redis.quit();
    process.exit(1);
  }

  const tokenData = await response.json();

  const newTokens: TokenData = {
    accessToken: tokenData.access_token,
    // Yahoo returns a new refresh token - we must save it
    refreshToken: tokenData.refresh_token || currentTokens.refreshToken,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  // Save new tokens to Redis
  console.log("💾 Saving new tokens to Redis...");
  await redis.set(TOKEN_KEY, JSON.stringify(newTokens));
  await redis.quit();

  const newExpiresIn = Math.round((newTokens.expiresAt - Date.now()) / 1000 / 60);

  console.log("\n✅ Token refresh successful!");
  console.log(`   New access token expires: ${new Date(newTokens.expiresAt).toLocaleString()}`);
  console.log(`   Valid for: ${newExpiresIn} minutes`);

  // Test the new token
  console.log("\n🧪 Testing new token...");

  const testResponse = await fetch(
    "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games?format=json",
    {
      headers: {
        Authorization: `Bearer ${newTokens.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (testResponse.ok) {
    console.log("✅ Token is working! API call successful.\n");
  } else {
    console.error(`⚠️ Token test failed: ${testResponse.status}`);
    const errorText = await testResponse.text();
    console.error(errorText);
    console.log("");
  }
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
