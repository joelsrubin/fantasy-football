import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export interface RankingEntry {
  rank: number;
  name: string;
  nickname: string;
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

// Cache for 1 day - this data only changes when we run the aggregate script
export const revalidate = 86400;

export async function GET() {
  try {
    const csvPath = join(process.cwd(), "data", "all-time-stats.csv");
    const csvContent = await readFile(csvPath, "utf-8");

    const lines = csvContent.trim().split("\n");
    const rankings: RankingEntry[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Parse CSV (handling quoted fields)
      const fields = parseCSVLine(line);

      if (fields.length >= 12) {
        rankings.push({
          rank: 0, // Will be assigned after sorting
          name: fields[0],
          nickname: fields[1],
          wins: parseInt(fields[2], 10),
          losses: parseInt(fields[3], 10),
          ties: parseInt(fields[4], 10),
          winPct: parseFloat(fields[5].replace("%", "")),
          pointsFor: parseFloat(fields[6]),
          pointsAgainst: parseFloat(fields[7]),
          pointDiff: parseFloat(fields[8]),
          seasonsPlayed: parseInt(fields[9], 10),
          championships: parseInt(fields[10], 10),
          seasons: fields[11].split(", ").map((s) => s.trim()),
        });
      }
    }

    // Sort by win percentage (descending), then by total wins as tiebreaker
    rankings.sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.wins - a.wins;
    });

    // Assign ranks after sorting
    rankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error("Error reading rankings:", error);
    return NextResponse.json({ rankings: [], error: "Rankings data not available" });
  }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}
