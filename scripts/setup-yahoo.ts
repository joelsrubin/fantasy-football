/**
 * Yahoo OAuth Setup Script
 * Run with: pnpm run setup-yahoo
 * 
 * This opens a browser for you to authorize the app,
 * then you paste the code back here.
 */

import { config } from "dotenv";
import { createInterface } from "node:readline";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "node:child_process";

// Load environment variables from .env.local
config({ path: ".env.local" });

const CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;
const REDIRECT_URI = "https://localhost:3000/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\n❌ Missing environment variables!");
  console.error("Please set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in your .env.local file\n");
  process.exit(1);
}

const authUrl = new URL("https://api.login.yahoo.com/oauth2/request_auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", "fspt-r");

console.log("\n🏈 Yahoo Fantasy Football OAuth Setup\n");
console.log("Opening browser for authorization...\n");

// Open the auth URL in the browser
const openCommand = process.platform === "darwin" 
  ? "open" 
  : process.platform === "win32" 
    ? "start" 
    : "xdg-open";

exec(`${openCommand} "${authUrl.toString()}"`);

console.log("After authorizing, you'll be redirected to a page that won't load.");
console.log("That's expected! Copy the 'code' parameter from the URL.\n");
console.log("The URL will look like:");
console.log("  https://localhost:3000/callback?code=XXXXXX\n");
console.log("Copy everything after 'code=' and paste it below.\n");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the code here: ", async (code) => {
  rl.close();
  
  const trimmedCode = code.trim();
  
  if (!trimmedCode) {
    console.error("\n❌ No code provided");
    process.exit(1);
  }

  console.log("\n⏳ Exchanging code for tokens...");

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    
    const tokenResponse = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: trimmedCode,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data = await tokenResponse.json();
    
    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    
    await writeFile(
      join(process.cwd(), ".yahoo-tokens.json"),
      JSON.stringify(tokens, null, 2)
    );

    console.log("\n✅ Authorization successful!");
    console.log("📁 Tokens saved to .yahoo-tokens.json");
    console.log("\n🚀 You can now run: pnpm dev\n");

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
