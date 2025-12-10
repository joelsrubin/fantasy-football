import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Managers - unique users identified by Yahoo guid
export const managers = sqliteTable(
  "managers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guid: text("guid").notNull().unique(),
    nickname: text("nickname").notNull(),
    imageUrl: text("image_url"),
  },
  (table) => [uniqueIndex("managers_guid_idx").on(table.guid)],
);

// Leagues - each league/season combination
export const leagues = sqliteTable(
  "leagues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueKey: text("league_key").notNull().unique(), // e.g., "449.l.730730"
    leagueId: text("league_id").notNull(), // e.g., "730730"
    gameKey: text("game_key").notNull(), // e.g., "449"
    name: text("name").notNull(),
    season: text("season").notNull(), // e.g., "2024"
    numTeams: integer("num_teams").notNull(),
    currentWeek: integer("current_week"),
    startWeek: integer("start_week"),
    endWeek: integer("end_week"),
    isFinished: integer("is_finished", { mode: "boolean" }).default(false),
    logoUrl: text("logo_url"),
    url: text("url"),
  },
  (table) => [uniqueIndex("leagues_key_idx").on(table.leagueKey)],
);

// Teams - a team in a specific league (one manager can have multiple teams across leagues)
export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamKey: text("team_key").notNull().unique(), // e.g., "449.l.730730.t.1"
    teamId: text("team_id").notNull(), // e.g., "1"
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    url: text("url"),
    // Standings data
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    ties: integer("ties").notNull().default(0),
    winPct: real("win_pct").notNull().default(0),
    pointsFor: real("points_for").notNull().default(0),
    pointsAgainst: real("points_against").notNull().default(0),
    rank: integer("rank"),
    playoffSeed: integer("playoff_seed"),
    isPlayoffTeam: integer("is_playoff_team", { mode: "boolean" }).default(false),
  },
  (table) => [uniqueIndex("teams_key_idx").on(table.teamKey)],
);

// Matchups - weekly head-to-head matchups
export const matchups = sqliteTable(
  "matchups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    week: integer("week").notNull(),
    team1Id: integer("team1_id")
      .notNull()
      .references(() => teams.id),
    team2Id: integer("team2_id")
      .notNull()
      .references(() => teams.id),
    team1Points: real("team1_points"),
    team2Points: real("team2_points"),
    winnerId: integer("winner_id").references(() => teams.id),
    isPlayoff: integer("is_playoff", { mode: "boolean" }).default(false),
    isTie: integer("is_tie", { mode: "boolean" }).default(false),
  },
  (table) => [
    uniqueIndex("matchups_unique_idx").on(table.leagueId, table.week, table.team1Id, table.team2Id),
  ],
);

// Rankings - computed aggregate stats per manager (updated by cron)
export const rankings = sqliteTable(
  "rankings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id)
      .unique(),
    totalWins: integer("total_wins").notNull().default(0),
    totalLosses: integer("total_losses").notNull().default(0),
    totalTies: integer("total_ties").notNull().default(0),
    winPct: real("win_pct").notNull().default(0),
    totalPointsFor: real("total_points_for").notNull().default(0),
    totalPointsAgainst: real("total_points_against").notNull().default(0),
    pointDiff: real("point_diff").notNull().default(0),
    seasonsPlayed: integer("seasons_played").notNull().default(0),
    championships: integer("championships").notNull().default(0),
    playoffAppearances: integer("playoff_appearances").notNull().default(0),
    updatedAt: text("updated_at"),
  },
  (table) => [uniqueIndex("rankings_manager_idx").on(table.managerId)],
);

// Weekly Rankings - historical ranking data by week for bump charts
export const weeklyRankings = sqliteTable(
  "weekly_rankings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id),
    week: integer("week").notNull(),
    rank: integer("rank").notNull(),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    ties: integer("ties").notNull().default(0),
    winPct: real("win_pct").notNull().default(0),
    pointsFor: real("points_for").notNull().default(0),
    pointsAgainst: real("points_against").notNull().default(0),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("weekly_rankings_unique_idx").on(table.leagueId, table.managerId, table.week),
  ],
);

// Type exports for inserts
export type InsertManager = typeof managers.$inferInsert;
export type InsertLeague = typeof leagues.$inferInsert;
export type InsertTeam = typeof teams.$inferInsert;
export type InsertMatchup = typeof matchups.$inferInsert;
export type InsertRanking = typeof rankings.$inferInsert;
export type InsertWeeklyRanking = typeof weeklyRankings.$inferInsert;

// Type exports for selects
export type Manager = typeof managers.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Matchup = typeof matchups.$inferSelect;
export type Ranking = typeof rankings.$inferSelect;
export type WeeklyRanking = typeof weeklyRankings.$inferSelect;
