CREATE TABLE `weekly_rankings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`manager_id` integer NOT NULL,
	`week` integer NOT NULL,
	`rank` integer NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`ties` integer DEFAULT 0 NOT NULL,
	`win_pct` real DEFAULT 0 NOT NULL,
	`points_for` real DEFAULT 0 NOT NULL,
	`points_against` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_rankings_unique_idx` ON `weekly_rankings` (`league_id`,`manager_id`,`week`);