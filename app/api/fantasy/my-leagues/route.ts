import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";

export interface LeagueInfo {
  leagueKey: string;
  leagueId: string;
  name: string;
  season: string;
  gameKey: string;
  numTeams: number;
  currentWeek: number;
  url: string | null;
  logoUrl: string | null;
}

export interface SeasonData {
  season: string;
  gameKey: string;
  leagues: LeagueInfo[];
}

// Cache for 5 minutes
export const revalidate = 300;

export async function GET() {
  try {
    // Fetch all leagues from database, ordered by season desc
    const leagues = await db.select().from(schema.leagues).orderBy(desc(schema.leagues.season));

    // Group by season
    const seasonMap = new Map<string, SeasonData>();

    for (const league of leagues) {
      const existing = seasonMap.get(league.season);

      const leagueInfo: LeagueInfo = {
        leagueKey: league.leagueKey,
        leagueId: league.leagueId,
        name: league.name,
        season: league.season,
        gameKey: league.gameKey,
        numTeams: league.numTeams,
        currentWeek: league.currentWeek || 1,
        url: league.url,
        logoUrl: league.logoUrl,
      };

      if (existing) {
        existing.leagues.push(leagueInfo);
      } else {
        seasonMap.set(league.season, {
          season: league.season,
          gameKey: league.gameKey,
          leagues: [leagueInfo],
        });
      }
    }

    // Convert to array (already sorted by Map insertion order from desc query)
    const seasons = Array.from(seasonMap.values());

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leagues" },
      { status: 500 },
    );
  }
}
