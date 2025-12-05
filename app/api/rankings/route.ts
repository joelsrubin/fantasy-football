import { createClient } from "redis";
import { NextResponse } from "next/server";

export interface RankingEntry {
  rank: number;
  name: string;
  nickname: string;
  guid: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  seasonsPlayed: number;
  championships: number;
  seasons: string[];
}

const REDIS_KEY = "all-time-rankings";

// Cache for 5 minutes - data updates weekly via cron
export const revalidate = 300;

export async function GET() {
  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return NextResponse.json(
        { rankings: [], error: "Redis not configured" },
        { status: 500 },
      );
    }

    const client = createClient({ url: redisUrl });
    await client.connect();

    const data = await client.get(REDIS_KEY);
    await client.destroy();

    if (!data) {
      return NextResponse.json({
        rankings: [],
        error: "No rankings data available. Run the aggregation cron job first.",
      });
    }

    const rawRankings = JSON.parse(data) as Omit<RankingEntry, "rank">[];

    // Add rank numbers (data is already sorted by winPct)
    const rankings: RankingEntry[] = rawRankings.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error("Error reading rankings from Redis:", error);
    return NextResponse.json(
      { rankings: [], error: "Failed to fetch rankings" },
      { status: 500 },
    );
  }
}
