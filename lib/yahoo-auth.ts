/**
 * Server-side Yahoo OAuth token management
 * Stores tokens in a local file so they can be updated when refreshed
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_FILE = join(process.cwd(), ".yahoo-tokens.json");

let cachedToken: TokenData | null = null;

async function loadTokensFromFile(): Promise<TokenData | null> {
  try {
    const data = await readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(data) as TokenData;
  } catch {
    return null;
  }
}

async function saveTokensToFile(tokens: TokenData): Promise<void> {
  await writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
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
    // Yahoo returns a new refresh token - we must save it!
    refreshToken: data.refresh_token || currentRefreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  // Persist the new tokens
  await saveTokensToFile(tokens);

  return tokens;
}

export async function getYahooAccessToken(): Promise<string> {
  // Try cache first
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  // Try loading from file
  const storedTokens = await loadTokensFromFile();

  if (storedTokens) {
    // Check if access token is still valid
    if (Date.now() < storedTokens.expiresAt - 60000) {
      cachedToken = storedTokens;
      return storedTokens.accessToken;
    }

    // Access token expired, refresh it
    cachedToken = await refreshAccessToken(storedTokens.refreshToken);
    return cachedToken.accessToken;
  }

  throw new Error("No Yahoo tokens found. Run 'pnpm run setup-yahoo' to authenticate with Yahoo.");
}

/**
 * Initial token setup - exchange authorization code for tokens
 */
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

  await saveTokensToFile(tokens);

  return tokens;
}
