import pg from 'pg';
const url = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
import { demoPosts } from '../packages/db/seed/content-demo.ts' assert { type: 'json' };

// Instead, just update read_time and re-use demoPosts via dynamic import with tsx
// Fallback: update directly with known values
const updates = [
  { slug: "introducing-ai-accounting", mins: 12 },
  { slug: "why-traditional-accounting-fails", mins: 13 },
  { slug: "building-ai-agents", mins: 14 },
  { slug: "multi-currency-support", mins: 12 },
  { slug: "security-best-practices", mins: 12 },
  { slug: "getting-started-guide", mins: 13 },
];
for (const u of updates) {
  // Need content too - load from seed via reading file as text and extracting?
}
// Load seed file as text and parse Content
import fs from 'fs';
const text = fs.readFileSync('packages/db/seed/content-demo.ts', 'utf8');
// crude: extract content by slug
for (const u of updates) {
  const slugRegex = new RegExp(`slug: "${u.slug}"[\\s\\S]*?content:\\s*\"([\\s\\S]*?)\"\\s*,\\s*category`, 'm');
  // try single quote for last one
  let m = text.match(new RegExp(`slug: "${u.slug}"[\\s\\S]*?content:\\s*\"([\\s\\S]*?)\"\\s*,\\s*category`));
  if (!m) m = text.match(new RegExp(`slug: "${u.slug}"[\\s\\S]*?content:\\s*'([\\s\\S]*?)'\\s*,\\s*category`));
  let content = m ? m[1] : null;
  // Unescape
  if (content) {
    // JS string escapes: replace \\n etc? content is raw TS string, keep as is for DB (markdown)
    // For DB we need to store markdown as is
    await client.query('UPDATE blog_posts SET content = $1, read_time_minutes = $2, updated_at = NOW() WHERE slug = $3', [content.replace(/\\n/g, '\n').replace(/\\"/g, '"'), u.mins, u.slug]);
    console.log('updated', u.slug, u.mins, content.length);
  } else {
    console.log('not found', u.slug);
    await client.query('UPDATE blog_posts SET read_time_minutes = $1 WHERE slug = $2', [u.mins, u.slug]);
  }
}
const res = await client.query('SELECT slug, read_time_minutes, LENGTH(content) as len FROM blog_posts ORDER BY published_at DESC');
console.log(res.rows);
await client.end();
