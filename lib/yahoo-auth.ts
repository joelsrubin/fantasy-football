/**
 * Server-side Yahoo OAuth token management.
 * Tokens are stored in Turso (app_settings table).
 */

import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { config } from "dotenv";
import { appSettings } from "@/db/schema";

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_KEY = "yahoo-tokens";

let cachedToken: TokenData | null = null;

function getDb() {
  config({ path: ".env.local" });

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
  }

  const client = createClient({ url, authToken });
  return drizzle(client, { schema: { appSettings } });
}

async function loadTokens(): Promise<TokenData | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, TOKEN_KEY))
    .limit(1);

  if (!row) {
    return null;
  }

  return JSON.parse(row.value) as TokenData;
}

async function saveTokens(tokens: TokenData): Promise<void> {
  cachedToken = tokens;

  const db = getDb();
  const value = JSON.stringify(tokens);

  await db
    .insert(appSettings)
    .values({ key: TOKEN_KEY, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value },
    });
}

async function refreshAccessToken(currentRefreshToken: string): Promise<TokenData> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Yahoo API credentials. Please set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET environment variables.",
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Yahoo token: ${errorText}`);
  }

  const data = await response.json();

  const tokens: TokenData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || currentRefreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await saveTokens(tokens);

  return tokens;
}

export async function getYahooAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  const storedTokens = await loadTokens();

  if (storedTokens) {
    if (storedTokens.accessToken && Date.now() < storedTokens.expiresAt - 60000) {
      cachedToken = storedTokens;
      return storedTokens.accessToken;
    }

    cachedToken = await refreshAccessToken(storedTokens.refreshToken);
    return cachedToken.accessToken;
  }

  throw new Error(
    "No Yahoo tokens found. Run 'pnpm setup-yahoo' to authenticate with Yahoo.",
  );
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing YAHOO_CLIENT_ID or YAHOO_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${errorText}`);
  }

  const data = await response.json();

  const tokens: TokenData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await saveTokens(tokens);

  return tokens;
}

export async function setTokens(tokens: TokenData): Promise<void> {
  await saveTokens(tokens);
}
