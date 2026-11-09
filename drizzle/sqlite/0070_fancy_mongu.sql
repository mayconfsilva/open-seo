CREATE TABLE `rank_competitor_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`tracking_keyword_id` text NOT NULL,
	`device` text NOT NULL,
	`domain` text NOT NULL,
	`position` integer NOT NULL,
	`url` text,
	`checked_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `rank_check_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rank_competitor_snapshots_run_key_idx` ON `rank_competitor_snapshots` (`run_id`,`tracking_keyword_id`,`device`,`domain`);