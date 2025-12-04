/**
 * Server-side Yahoo OAuth token management
 * Uses Redis in production (with file fallback for initial tokens),
 * uses local file only in development
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createClient } from "redis";

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_KEY = "yahoo-tokens";
const TOKEN_FILE = join(process.cwd(), ".yahoo-tokens.json");

// In-memory cache for the current process
let cachedToken: TokenData | null = null;

// Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return null;
    }
    try {
      redisClient = createClient({ url: redisUrl });
      await redisClient.connect();
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      return null;
    }
  }
  return redisClient;
}

// Check if Redis is available
async function hasRedis(): Promise<boolean> {
  const client = await getRedisClient();
  return client !== null;
}

async function loadTokensFromFile(): Promise<TokenData | null> {
  try {
    const data = await readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(data) as TokenData;
  } catch {
    return null;
  }
}

async function saveTokensToFile(tokens: TokenData): Promise<void> {
  try {
    await writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    // In production, file system is read-only - this is expected
    console.log("Could not write to file (expected in production):", error);
  }
}

async function loadTokensFromRedis(): Promise<TokenData | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) return null;
    
    const data = await redis.get(TOKEN_KEY);
    if (data) {
      return JSON.parse(data) as TokenData;
    }
    return null;
  } catch (error) {
    console.error("Failed to load tokens from Redis:", error);
    return null;
  }
}

async function saveTokensToRedis(tokens: TokenData): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) return false;
    
    await redis.set(TOKEN_KEY, JSON.stringify(tokens));
    return true;
  } catch (error) {
    console.error("Failed to save tokens to Redis:", error);
    return false;
  }
}

async function loadTokens(): Promise<TokenData | null> {
  // Try Redis first (if available)
  if (await hasRedis()) {
    const redisTokens = await loadTokensFromRedis();
    if (redisTokens) {
      return redisTokens;
    }
    
    // Redis is empty - try to migrate from file
    const fileTokens = await loadTokensFromFile();
    if (fileTokens) {
      console.log("Migrating tokens from file to Redis...");
      await saveTokensToRedis(fileTokens);
      return fileTokens;
    }
    
    return null;
  }
  
  // No Redis - use file (development mode)
  return loadTokensFromFile();
}

async function saveTokens(tokens: TokenData): Promise<void> {
  // Try Redis first
  if (await hasRedis()) {
    const saved = await saveTokensToRedis(tokens);
    if (saved) {
      return;
    }
  }
  
  // Fall back to file (development mode or Redis failure)
  await saveTokensToFile(tokens);
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
  await saveTokens(tokens);

  return tokens;
}

export async function getYahooAccessToken(): Promise<string> {
  // Try cache first
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  // Try loading from storage
  const storedTokens = await loadTokens();

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

  throw new Error(
    "No Yahoo tokens found. Run 'pnpm run setup-yahoo' locally to authenticate with Yahoo.",
  );
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

  await saveTokens(tokens);

  return tokens;
}

/**
 * Manually set tokens (useful for initial setup in production)
 */
export async function setTokens(tokens: TokenData): Promise<void> {
  await saveTokens(tokens);
  cachedToken = tokens;
}
