// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age").notNull(),
  email: text("email").notNull(),
  consent: boolean("consent").notNull(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull(),
});

export const simulationSessions = pgTable("simulation_sessions", {
  id: uuid("id").primaryKey(),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull().default("not-started"),
  completedTasks: integer("completed_tasks").notNull().default(0),
});

/** Durable replacement for the browser-only localStorage state used by the MVP. */
export const simulationState = pgTable("simulation_state", {
  participantId: uuid("participant_id").primaryKey().references(() => participants.id),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const simulationEvents = pgTable("simulation_events", {
  id: uuid("id").primaryKey(),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
