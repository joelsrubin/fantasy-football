import { NextResponse } from "next/server";
import { db } from "@/db/db";

const ONE_YEAR = 31536000;
async function getAllManagersWithTeams() {
  return await db.query.managers.findMany({
    with: {
      teams: true,
    },
  });
}
export async function GET() {
  try {
    const managersWithTeams = await getAllManagersWithTeams();
    console.log({ managersWithTeams });
    if (!managersWithTeams) {
      return NextResponse.json({ error: "No managers found" }, { status: 404 });
    }

    const maxAge = ONE_YEAR;

    return NextResponse.json(
      {
        managers: managersWithTeams,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        },
      },
    );
  } catch (error) {
    console.error("Error fetching managers:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch managers" },
      { status: 500 },
    );
  }
}
