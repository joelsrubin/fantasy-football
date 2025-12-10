import { useQuery } from "@tanstack/react-query";

export interface WeeklyRankingData {
  week: number;
  rankings: {
    managerId: number;
    managerName: string;
    rank: number;
    wins: number;
    losses: number;
    ties: number;
    winPct: number;
    pointsFor: number;
    pointsAgainst: number;
  }[];
}

export function useWeeklyRankings(leagueId: string) {
  return useQuery<{ weeklyRankings: WeeklyRankingData[] }, Error>({
    queryKey: ["weekly-rankings", leagueId],
    queryFn: async () => {
      // Try leagueKey first, then fall back to leagueId
      let url = `/api/rankings/weekly?leagueKey=${leagueId}`;
      let response = await fetch(url);

      if (!response.ok && !leagueId.includes(".")) {
        // If it failed and leagueId doesn't contain a dot (not a league key), try as database ID
        url = `/api/rankings/weekly?leagueId=${leagueId}`;
        response = await fetch(url);
      }

      if (!response.ok) {
        throw new Error("Failed to fetch weekly rankings");
      }
      return response.json();
    },
  });
}
