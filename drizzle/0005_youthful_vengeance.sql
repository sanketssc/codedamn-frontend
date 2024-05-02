CREATE TABLE IF NOT EXISTS "running_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"service_arn" text,
	"task_arn" text,
	"target_group1_arn" text,
	"target_group2_arn" text,
	"listener_rule_arn1" text,
	"listener_rule_arn2" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "running_task" ADD CONSTRAINT "running_task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
