CREATE TABLE "project_services" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "draft_since" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "segment" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "audience" text;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_services_project_name_idx" ON "project_services" USING btree ("project_id","name");