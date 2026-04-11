import {
  pgTable,
  uuid,
  varchar,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Users (populated by NextAuth) ──────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── NextAuth accounts (OAuth providers) ────────────────────────────────
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at"),
});

// ── Sessions ───────────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// ── NBA Teams (seeded with all 30 teams) ───────────────────────────────
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 10 }).notNull(),
  espnId: varchar("espn_id", { length: 20 }).notNull(),
  conference: varchar("conference", { length: 10 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
});

// ── User → Team subscriptions (many-to-many) ──────────────────────────
export const userTeams = pgTable(
  "user_teams",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.teamId] })]
);

// ── Notification preferences ───────────────────────────────────────────
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 50 }).notNull(), // 'game_starting' | '4th_quarter' | 'halftime_ending' | 'close_game'
    enabled: boolean("enabled").default(true).notNull(),
    threshold: integer("threshold"), // for 'close_game': point differential
  },
  (table) => [uniqueIndex("uniq_user_event").on(table.userId, table.eventType)]
);

// ── Web Push subscriptions (one per device) ────────────────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Game state cache (tracks live games + what notifications were sent) ─
export const gameStates = pgTable("game_states", {
  gameId: varchar("game_id", { length: 50 }).primaryKey(),
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  status: varchar("status", { length: 20 }).notNull(), // 'scheduled' | 'in_progress' | 'halftime' | 'finished'
  period: integer("period").default(0).notNull(),
  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  gameDate: date("game_date").notNull(),
  startTime: timestamp("start_time"),
  lastPolledAt: timestamp("last_polled_at"),
  notificationsSent: jsonb("notifications_sent").default([]).notNull(),
  qstashScheduleId: varchar("qstash_schedule_id", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Notification log ───────────────────────────────────────────────────
export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  gameId: varchar("game_id", { length: 50 }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payload: jsonb("payload"),
  delivered: boolean("delivered").default(false).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});
