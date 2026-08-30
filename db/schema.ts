import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const activities = sqliteTable(
  "activities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    type: text("type").notNull(),
    activityDate: text("activity_date").notNull(),
    startTime: text("start_time"),
    status: text("status").notNull().default("scheduled"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("activities_owner_date_idx").on(table.ownerKey, table.activityDate),
    index("activities_owner_status_idx").on(table.ownerKey, table.status),
  ],
);

export const weights = sqliteTable(
  "weights",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    weight: real("weight").notNull(),
    measuredAt: text("measured_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("weights_owner_date_idx").on(table.ownerKey, table.measuredAt)],
);

export const activityTypes = sqliteTable(
  "activity_types",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    name: text("name").notNull(),
    iconKey: text("icon_key").notNull().default("sparkles"),
    color: text("color").notNull().default("#65a84f"),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("activity_types_owner_name_idx").on(table.ownerKey, table.name),
  ],
);
