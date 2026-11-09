CREATE TABLE "rank_keyword_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ADD COLUMN "group_id" text;--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ADD COLUMN "target_url" text;--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ADD COLUMN "search_intent" text;--> statement-breakpoint
ALTER TABLE "rank_keyword_groups" ADD CONSTRAINT "rank_keyword_groups_config_id_rank_tracking_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."rank_tracking_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rank_keyword_groups_config_name_idx" ON "rank_keyword_groups" USING btree ("config_id","name");--> statement-breakpoint
ALTER TABLE "rank_tracking_keywords" ADD CONSTRAINT "rank_tracking_keywords_group_id_rank_keyword_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."rank_keyword_groups"("id") ON DELETE set null ON UPDATE no action;