CREATE TABLE `project_services` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_services_project_name_idx` ON `project_services` (`project_id`,`name`);--> statement-breakpoint
ALTER TABLE `projects` ADD `draft_since` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `segment` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `audience` text;--> statement-breakpoint
ALTER TABLE `project_competitors` ADD `kind` text;