/**
 * Verify Yahoo OAuth configuration before running setup-yahoo.
 * Run with: pnpm verify-yahoo
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const REDIRECT_URI = process.env.YAHOO_REDIRECT_URI || "oob";

async function main() {
  console.log("\n🔍 Verifying Yahoo OAuth configuration\n");

  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ Missing YAHOO_CLIENT_ID or YAHOO_CLIENT_SECRET in .env.local");
    console.error("   Pull from Vercel: npx vercel env pull .env.local --scope joelsrubins-projects");
    console.error("   Or create a new app at https://developer.yahoo.com/apps/\n");
    process.exit(1);
  }

  console.log("✅ YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET are set");
  console.log(`   Redirect URI: ${REDIRECT_URI}`);

  const authUrl = new URL("https://api.login.yahoo.com/oauth2/request_auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "fspt-r");

  const response = await fetch(authUrl.toString(), { redirect: "manual" });
  const location = response.headers.get("location") || "";

  if (location.includes("error=unauthorized_client") || location.includes("invalid+client")) {
    console.error("\n❌ Yahoo rejected the client ID.");
    console.error("   Your Yahoo app may have been deleted or credentials are outdated.");
    console.error("   Create a new app at https://developer.yahoo.com/apps/ and update:");
    console.error("   - YAHOO_CLIENT_ID");
    console.error("   - YAHOO_CLIENT_SECRET");
    console.error("   in .env.local and on Vercel.\n");
    process.exit(1);
  }

  if (location.includes("invalid+redirect")) {
    console.error("\n❌ Yahoo rejected the redirect URI.");
    console.error(`   Current: ${REDIRECT_URI}`);
    console.error("   Try adding to .env.local:");
    console.error("   YAHOO_REDIRECT_URI=oob");
    console.error("   Then re-run: pnpm verify-yahoo\n");
    process.exit(1);
  }

  console.log("✅ Yahoo accepts your client ID and redirect URI");
  console.log("\nNext step:");
  console.log(`   pnpm setup-yahoo\n`);
  console.log("Auth URL (open in browser if needed):");
  console.log(authUrl.toString());
  console.log("");
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
