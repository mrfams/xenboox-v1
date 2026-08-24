import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { entities } from "./organization";

/**
 * Referral Program
 *
 * Each user gets a unique referral link. When someone signs up via that link
 * and activates their account, both the referrer and referee get a reward
 * (e.g. free month, discount).
 */

export const referralCodes = pgTable("referral_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  entityId: text("entity_id").references(() => entities.id),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referralSignups = pgTable("referral_signups", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralCodeId: text("referral_code_id")
    .notNull()
    .references(() => referralCodes.id),
  referrerUserId: text("referrer_user_id")
    .notNull()
    .references(() => users.id),
  refereeEmail: text("referee_email").notNull(),
  refereeUserId: text("referee_user_id").references(() => users.id),
  status: text("status").notNull().default("pending"), // pending | activated | rewarded
  rewardGranted: boolean("reward_granted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  activatedAt: timestamp("activated_at"),
  rewardedAt: timestamp("rewarded_at"),
});

export const referralRewards = pgTable("referral_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralSignupId: text("referral_signup_id")
    .notNull()
    .references(() => referralSignups.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(), // free_month | discount | credit
  amount: integer("amount"), // in cents, if applicable
  description: text("description").notNull(),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});
