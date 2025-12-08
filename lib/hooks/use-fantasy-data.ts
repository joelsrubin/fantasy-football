"use client";

import { useQuery } from "@tanstack/react-query";
import type { League } from "@/db/schema";
import type { YahooRosterPlayer } from "@/lib/yahoo-fantasy";

interface SeasonData {
  season: string;
  gameKey: string;
  leagues: League[];
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

async function fetchLeague(leagueKey: string): Promise<League> {
  const response = await fetch(`/api/fantasy/league/${encodeURIComponent(leagueKey)}`);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch league");
  }
  const data = await response.json();
  return data.league;
}

// New DB-backed standings format
export interface StandingEntry {
  teamKey: string;
  teamId: string;
  name: string;
  logoUrl: string | null;
  url: string | null;
  manager: {
    guid: string;
    nickname: string;
    imageUrl: string | null;
  };
  standings: {
    rank: number | null;
    wins: number;
    losses: number;
    ties: number;
    winPct: number;
    pointsFor: number;
    pointsAgainst: number;
    playoffSeed: number | null;
  };
}

async function fetchStandings(leagueKey: string): Promise<StandingEntry[]> {
  const response = await fetch(`/api/fantasy/league/${encodeURIComponent(leagueKey)}/standings`);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch standings");
  }
  const data = await response.json();
  return data.standings;
}

// New DB-backed matchup format
export interface MatchupTeam {
  teamKey: string;
  teamId: string;
  name: string;
  logoUrl: string | null;
  points: number | null;
  isWinner: boolean;
  manager: {
    guid: string;
    nickname: string;
    imageUrl: string | null;
  } | null;
}

export interface MatchupEntry {
  week: number;
  isPlayoff: boolean;
  isTie: boolean;
  teams: MatchupTeam[];
}

async function fetchScoreboard(leagueKey: string, week: number): Promise<MatchupEntry[]> {
  const url = `/api/fantasy/league/${encodeURIComponent(leagueKey)}/scoreboard?week=${week}`;
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

export type FunFact =
  | {
      type: "biggestBlowout" | "closestMatchup";
      week: number;
      year: string;
      isPlayoff: boolean;
      winner: { name: string; points: number };
      loser: { name: string; points: number };
      margin: number;
    }
  | {
      type: "longestWinStreak";
      week: number;
      year: string;
      isPlayoff: boolean;
      startWeek: number;
      endWeek: number;
      team: string;
      streak: number;
    };

export type FunFacts = FunFact[];

async function fetchFunFacts(): Promise<FunFacts> {
  const response = await fetch("/api/fun-facts");
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch fun facts");
  }
  return response.json();
}

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

async function fetchRankings(): Promise<RankingEntry[]> {
  const response = await fetch("/api/rankings");
  if (!response.ok) {
    throw new Error("Failed to fetch rankings");
  }
  const data = await response.json();
  return data.rankings;
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
    queryFn: () => fetchScoreboard(leagueKey, week!),
    // Only fetch when we have a valid week number
    enabled: !!leagueKey && week !== undefined && week > 0 && !Number.isNaN(week),
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

export function useRankings() {
  return useQuery({
    queryKey: ["rankings"],
    queryFn: fetchRankings,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - this data only changes when we run aggregate script
  });
}

export function useFunFacts() {
  return useQuery({
    queryKey: ["fun-facts"],
    queryFn: fetchFunFacts,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Re-export types
export type { SeasonData };
