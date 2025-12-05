import { NextResponse } from "next/server";
import { setTokens, type TokenData } from "@/lib/yahoo-auth";

/**
 * POST /api/auth/setup-tokens
 * 
 * Sets up Yahoo tokens in Redis.
 * Requires a secret key to prevent unauthorized access.
 * 
 * Body: { accessToken, refreshToken, expiresAt, secret }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken, refreshToken, expiresAt, secret } = body;

    // Verify the setup secret
    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret || secret !== setupSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!accessToken || !refreshToken || !expiresAt) {
      return NextResponse.json(
        { error: "Missing required fields: accessToken, refreshToken, expiresAt" },
        { status: 400 },
      );
    }

    const tokens: TokenData = {
      accessToken,
      refreshToken,
      expiresAt: Number(expiresAt),
    };

    await setTokens(tokens);

    return NextResponse.json({ success: true, message: "Tokens saved to Redis" });
  } catch (error) {
    console.error("Error setting up tokens:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set up tokens" },
      { status: 500 },
    );
  }
}

