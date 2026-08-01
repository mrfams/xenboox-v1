import { neon } from "@neondatabase/serverless";

const sql = neon(
  "postgresql://neondb_owner:npg_hS1rq9sLmjnP@ep-crimson-lake-abh33lg6-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
);

async function main() {
  console.log("Dropping public schema...");
  await sql("DROP SCHEMA IF EXISTS public CASCADE");
  console.log("Creating public schema...");
  await sql("CREATE SCHEMA public");
  console.log("Granting permissions...");
  await sql("GRANT ALL ON SCHEMA public TO public");
  console.log("DONE");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
