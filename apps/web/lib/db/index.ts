import { db } from "@xenboox/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@xenboox/db/schema/auth";
import { adminUsers, adminSessions, adminAuditLog } from "@xenboox/db/schema";

export { db, users, accounts, sessions, verificationTokens };
export { adminUsers, adminSessions, adminAuditLog };
