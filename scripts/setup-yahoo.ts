/**
 * Yahoo OAuth Setup Script
 * Run with: pnpm run setup-yahoo
 * Or pass the code directly: pnpm run setup-yahoo -- <code>
 */

import { exec } from "node:child_process";
import { createInterface } from "node:readline";
import { config } from "dotenv";

config({ path: ".env.local" });

const CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;
const REDIRECT_URI = process.env.YAHOO_REDIRECT_URI || "oob";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\n❌ Missing environment variables!");
  console.error("Please set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in your .env.local file");
  console.error("Run: pnpm verify-yahoo to diagnose\n");
  process.exit(1);
}

const authUrl = new URL("https://api.login.yahoo.com/oauth2/request_auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", "fspt-r");

async function exchangeAndSave(code: string) {
  const { exchangeCodeForTokens } = await import("@/lib/yahoo-auth");

  console.log("\n⏳ Exchanging code for tokens...");

  try {
    await exchangeCodeForTokens(code, REDIRECT_URI);
    console.log("\n✅ Authorization successful!");
    console.log("📁 Tokens saved to Turso");
    console.log("\n🚀 You can now run: pnpm seed-db && pnpm dev\n");
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    console.error("\n❌ Error:", message);

    if (message.includes("invalid_client") || message.includes("INVALID_CLIENT")) {
      console.error("\n💡 Yahoo rejected the client credentials.");
      console.error("   Create a new app at https://developer.yahoo.com/apps/");
      console.error("   Update YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in .env.local\n");
    } else if (message.includes("INVALID_AUTHORIZATION_CODE")) {
      console.error("\n💡 The code expired (they last ~60 seconds). Run setup-yahoo again");
      console.error("   and paste the new code immediately.\n");
    }

    process.exit(1);
  }
}

const codeFromArgs = process.argv.slice(2).find((arg) => arg !== "--")?.trim();

if (codeFromArgs) {
  void exchangeAndSave(codeFromArgs);
} else {
  console.log("\n🏈 Yahoo Fantasy Football OAuth Setup\n");
  console.log(`Using redirect URI: ${REDIRECT_URI}`);
  console.log("Opening browser for authorization...\n");
  console.log(`Auth URL:\n${authUrl.toString()}\n`);

  const openCommand =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";

  exec(`${openCommand} "${authUrl.toString()}"`);

  if (REDIRECT_URI === "oob") {
    console.log("After authorizing, Yahoo will show a verification code on screen.");
    console.log("Copy that code and paste it below.\n");
  } else {
    console.log("After authorizing, you'll be redirected to a page that won't load.");
    console.log("That's expected! Copy the 'code' parameter from the URL.\n");
    console.log("The URL will look like:");
    console.log(`  ${REDIRECT_URI}?code=XXXXXX\n`);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Paste the code here: ", (code) => {
    rl.close();

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      console.error("\n❌ No code provided");
      process.exit(1);
    }

    void exchangeAndSave(trimmedCode);
  });
}
