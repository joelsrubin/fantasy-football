CREATE TABLE `leagues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_key` text NOT NULL,
	`league_id` text NOT NULL,
	`game_key` text NOT NULL,
	`name` text NOT NULL,
	`season` text NOT NULL,
	`num_teams` integer NOT NULL,
	`current_week` integer,
	`start_week` integer,
	`end_week` integer,
	`is_finished` integer DEFAULT false,
	`logo_url` text,
	`url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leagues_league_key_unique` ON `leagues` (`league_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `leagues_key_idx` ON `leagues` (`league_key`);--> statement-breakpoint
CREATE TABLE `managers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guid` text NOT NULL,
	`nickname` text NOT NULL,
	`image_url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `managers_guid_unique` ON `managers` (`guid`);--> statement-breakpoint
CREATE UNIQUE INDEX `managers_guid_idx` ON `managers` (`guid`);--> statement-breakpoint
CREATE TABLE `matchups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`week` integer NOT NULL,
	`team1_id` integer NOT NULL,
	`team2_id` integer NOT NULL,
	`team1_points` real,
	`team2_points` real,
	`winner_id` integer,
	`is_playoff` integer DEFAULT false,
	`is_tie` integer DEFAULT false,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team1_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team2_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matchups_unique_idx` ON `matchups` (`league_id`,`week`,`team1_id`,`team2_id`);--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manager_id` integer NOT NULL,
	`total_wins` integer DEFAULT 0 NOT NULL,
	`total_losses` integer DEFAULT 0 NOT NULL,
	`total_ties` integer DEFAULT 0 NOT NULL,
	`win_pct` real DEFAULT 0 NOT NULL,
	`total_points_for` real DEFAULT 0 NOT NULL,
	`total_points_against` real DEFAULT 0 NOT NULL,
	`point_diff` real DEFAULT 0 NOT NULL,
	`seasons_played` integer DEFAULT 0 NOT NULL,
	`championships` integer DEFAULT 0 NOT NULL,
	`playoff_appearances` integer DEFAULT 0 NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rankings_manager_id_unique` ON `rankings` (`manager_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rankings_manager_idx` ON `rankings` (`manager_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_key` text NOT NULL,
	`team_id` text NOT NULL,
	`league_id` integer NOT NULL,
	`manager_id` integer NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`url` text,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`ties` integer DEFAULT 0 NOT NULL,
	`win_pct` real DEFAULT 0 NOT NULL,
	`points_for` real DEFAULT 0 NOT NULL,
	`points_against` real DEFAULT 0 NOT NULL,
	`rank` integer,
	`playoff_seed` integer,
	`is_playoff_team` integer DEFAULT false,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_team_key_unique` ON `teams` (`team_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_key_idx` ON `teams` (`team_key`);