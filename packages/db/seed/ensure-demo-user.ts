import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema";
import { users } from "../schema/auth";

const DATABASE_URL =
  "postgresql://neondb_owner:npg_hS1rq9sLmjnP@ep-crimson-lake-abh33lg6-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema: schema as any });

const DEMO_EMAIL = "demo@xenboox.com";
const DEMO_PASSWORD = "demo1234";
const DEMO_PASSWORD_HASH =
  "$2a$12$QrxmI9v0MpLRsg6gWTH7F./KZOQl3fOoJDHGI4VzjOV0LHcpMED/2";

async function main() {
  console.log("Setting up demo user...");

  const existing = await sql`
    SELECT id, email FROM users WHERE email = ${DEMO_EMAIL}
  `;

  let userId: string;
  if (existing.length === 0) {
    userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, name, email, password_hash, email_verified, auth_provider, created_at, updated_at)
      VALUES (${userId}, 'Demo User', ${DEMO_EMAIL}, ${DEMO_PASSWORD_HASH}, NOW(), 'credentials', NOW(), NOW())
    `;
    console.log(`Created user: ${DEMO_EMAIL}`);
  } else {
    userId = existing[0].id;
    await sql`
      UPDATE users SET password_hash = ${DEMO_PASSWORD_HASH}, updated_at = NOW() WHERE email = ${DEMO_EMAIL}
    `;
    console.log(`Updated user: ${DEMO_EMAIL}`);
  }

  const orgResult = await sql`
    SELECT id FROM organizations WHERE owner_id = ${userId} LIMIT 1
  `;

  let orgId: string;
  if (orgResult.length === 0) {
    orgId = crypto.randomUUID();
    await sql`
      INSERT INTO organizations (id, name, slug, type, plan, owner_id, settings, created_at, updated_at)
      VALUES (${orgId}, 'Kerr Jula Trading Co.', 'kerr-jula-trading', 'business', 'starter', ${userId}, '{"timezone":"Africa/Banjul","locale":"en-GM"}', NOW(), NOW())
    `;
    console.log(`Created organization: ${orgId}`);
  } else {
    orgId = orgResult[0].id;
    console.log(`Organization exists: ${orgId}`);
  }

  const entityResult = await sql`
    SELECT id FROM entities WHERE organization_id = ${orgId} LIMIT 1
  `;

  let entityId: string;
  if (entityResult.length === 0) {
    entityId = crypto.randomUUID();
    await sql`
      INSERT INTO entities (id, organization_id, name, type, currency, country, fiscal_year_end, tax_id, settings, is_active, created_at, updated_at)
      VALUES (${entityId}, ${orgId}, 'Kerr Jula Trading Co.', 'company', 'GMD', 'GM', '12', 'GD123456789', '{"vatRate":0.15,"defaultPaymentTerms":"net30"}', true, NOW(), NOW())
    `;
    console.log(`Created entity: ${entityId}`);
  } else {
    entityId = entityResult[0].id;
    console.log(`Entity exists: ${entityId}`);
  }

  const accessResult = await sql`
    SELECT id FROM user_entity_access WHERE user_id = ${userId} AND entity_id = ${entityId}
  `;

  if (accessResult.length === 0) {
    const accessId = crypto.randomUUID();
    await sql`
      INSERT INTO user_entity_access (id, user_id, entity_id, role, granted_by, created_at, updated_at)
      VALUES (${accessId}, ${userId}, ${entityId}, 'owner', ${userId}, NOW(), NOW())
    `;
    console.log(`Granted entity access: owner`);
  } else {
    console.log(`Entity access already exists`);
  }

  const final = await sql`
    SELECT u.id, u.email, u.email_verified, o.id as org_id, e.id as entity_id
    FROM users u
    LEFT JOIN organizations o ON o.owner_id = u.id
    LEFT JOIN entities e ON e.organization_id = o.id
    WHERE u.email = ${DEMO_EMAIL}
  `;
  console.log("Final record:", final[0]);
  console.log("DONE");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
