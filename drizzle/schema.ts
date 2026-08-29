import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const emailReviews = mysqlTable("emailReviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  subject: varchar("subject", { length: 255 }),
  emailText: text("emailText").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  sentiment: varchar("sentiment", { length: 32 }).notNull(),
  urgency: varchar("urgency", { length: 32 }).notNull(),
  confidence: int("confidence").notNull(),
  draftText: text("draftText").notNull(),
  knowledgeContext: text("knowledgeContext").notNull(),
  status: mysqlEnum("status", ["in_review", "approved", "rejected", "escalated", "sent_simulated"]).default("in_review").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailReview = typeof emailReviews.$inferSelect;
export type InsertEmailReview = typeof emailReviews.$inferInsert;