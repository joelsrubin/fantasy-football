import { config } from "dotenv";
import { getYahooAccessToken } from "../lib/yahoo-auth";

// Load environment variables
config({ path: ".env.local" });

async function testTokenRefresh() {
  try {
    console.log("Testing token refresh...");
    const token = await getYahooAccessToken();
    console.log("✅ Token refresh successful!");
    console.log(`Token length: ${token.length} characters`);
  } catch (error) {
    console.error("❌ Token refresh failed:", error instanceof Error ? error.message : error);
  }
}

testTokenRefresh();
