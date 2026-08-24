# R2 Storage Fallback

> Cloudflare R2 file storage configuration and local fallback strategy.

---

## Current Setup

Cloudflare R2 is used for document storage (PDFs, exports, uploads).

### Configuration

```typescript
// lib/storage/r2.ts
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
```

---

## Fallback Strategy

### Primary: Cloudflare R2

- Auto-scales with traffic
- 10GB free tier
- No egress fees

### Fallback: Local Filesystem

When R2 is unavailable (network issues, misconfiguration):

```typescript
// lib/storage/fallback.ts
async function uploadWithFallback(key: string, body: Buffer) {
  try {
    // Try R2 first
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
      }),
    );
  } catch (error) {
    console.error("R2 upload failed, falling back to local:", error);
    // Write to local filesystem
    const localPath = path.join(process.cwd(), "uploads", key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, body);
  }
}
```

---

## Monitoring

| Metric             | Alert Threshold | Action                      |
| ------------------ | --------------- | --------------------------- |
| R2 upload failures | > 5/hour        | Check R2 status             |
| Fallback triggers  | > 10/day        | Investigate R2 connectivity |
| Local disk usage   | > 1GB           | Clean up old fallback files |

---

_Last updated: August 2026_
