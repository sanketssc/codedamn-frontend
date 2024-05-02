import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@/db";

export const userTable = pgTable("user", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
});
export const sessionTable = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const projectTable = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  template: text("template").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
});

export const runningTaskTable = pgTable("running_task", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectTable.id),
  serviceArn: text("service_arn"),
  taskArn: text("task_arn"),
  targetGroup1Arn: text("target_group1_arn"),
  targetGroup2Arn: text("target_group2_arn"),
  listenerRuleArn1: text("listener_rule_arn1"),
  listenerRuleArn2: text("listener_rule_arn2"),
});

export const adapter = new DrizzlePostgreSQLAdapter(
  db,
  sessionTable,
  userTable
);
