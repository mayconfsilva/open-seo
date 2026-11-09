CREATE TABLE `rank_keyword_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`config_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`config_id`) REFERENCES `rank_tracking_configs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rank_keyword_groups_config_name_idx` ON `rank_keyword_groups` (`config_id`,`name`);--> statement-breakpoint
ALTER TABLE `rank_tracking_keywords` ADD `group_id` text REFERENCES rank_keyword_groups(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `rank_tracking_keywords` ADD `target_url` text;--> statement-breakpoint
ALTER TABLE `rank_tracking_keywords` ADD `search_intent` text;