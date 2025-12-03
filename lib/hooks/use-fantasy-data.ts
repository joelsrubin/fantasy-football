"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  YahooLeague,
  YahooMatchup,
  YahooRosterPlayer,
  YahooTeamStandings,
} from "@/lib/yahoo-fantasy";

// Types for API responses
interface LeagueInfo {
  leagueKey: string;
  leagueId: string;
  name: string;
  season: string;
  gameKey: string;
  numTeams: number;
  currentWeek: number;
  url: string;
  logoUrl?: string;
}

interface SeasonData {
  season: string;
  gameKey: string;
  leagues: LeagueInfo[];
}

// Fetch functions
async function fetchMyLeagues(): Promise<SeasonData[]> {
  const response = await fetch("/api/fantasy/my-leagues");
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch leagues");
  }
  const data = await response.json();
  return data.seasons;
}

async function fetchLeague(leagueKey: string): Promise<YahooLeague> {
  const response = await fetch(`/api/fantasy/league/${encodeURIComponent(leagueKey)}`);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch league");
  }
  const data = await response.json();
  return data.league;
}

async function fetchStandings(leagueKey: string): Promise<YahooTeamStandings[]> {
  const response = await fetch(`/api/fantasy/league/${encodeURIComponent(leagueKey)}/standings`);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch standings");
  }
  const data = await response.json();
  return data.standings;
}

async function fetchScoreboard(leagueKey: string, week?: number): Promise<YahooMatchup[]> {
  const url = week
    ? `/api/fantasy/league/${encodeURIComponent(leagueKey)}/scoreboard?week=${week}`
    : `/api/fantasy/league/${encodeURIComponent(leagueKey)}/scoreboard`;
  const response = await fetch(url);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch scoreboard");
  }
  const data = await response.json();
  return data.matchups;
}

async function fetchTeamRoster(
  leagueKey: string,
  teamId: string,
  week?: number,
): Promise<YahooRosterPlayer[]> {
  const url = week
    ? `/api/fantasy/league/${encodeURIComponent(leagueKey)}/team/${teamId}?week=${week}`
    : `/api/fantasy/league/${encodeURIComponent(leagueKey)}/team/${teamId}`;
  const response = await fetch(url);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch roster");
  }
  const data = await response.json();
  return data.roster;
}

// Hooks
export function useMyLeagues() {
  return useQuery({
    queryKey: ["my-leagues"],
    queryFn: fetchMyLeagues,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLeague(leagueKey: string) {
  return useQuery({
    queryKey: ["league", leagueKey],
    queryFn: () => fetchLeague(leagueKey),
    enabled: !!leagueKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStandings(leagueKey: string) {
  return useQuery({
    queryKey: ["standings", leagueKey],
    queryFn: () => fetchStandings(leagueKey),
    enabled: !!leagueKey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useScoreboard(leagueKey: string, week?: number) {
  return useQuery({
    queryKey: ["scoreboard", leagueKey, week],
    queryFn: () => fetchScoreboard(leagueKey, week),
    enabled: !!leagueKey,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useTeamRoster(leagueKey: string, teamId: string, week?: number) {
  return useQuery({
    queryKey: ["roster", leagueKey, teamId, week],
    queryFn: () => fetchTeamRoster(leagueKey, teamId, week),
    // Require week to be set - important for prior year leagues
    enabled: !!leagueKey && !!teamId && week !== undefined,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Re-export types
export type { LeagueInfo, SeasonData };
