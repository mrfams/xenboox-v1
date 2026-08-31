import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// ─── R2 Client ──────────────────────────────────────────────────────────────

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

let _r2: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;
  if (!_r2) {
    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2;
}

/** @deprecated Use getR2Client() for safe access. */
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID ?? ""}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "xenboox-documents";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRESIGN_EXPIRY = 900; // 15 minutes

export async function getPresignedUploadUrl(
  storagePath: string,
  mimeType: string,
  fileSize: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: storagePath,
    ContentType: mimeType,
    ContentLength: fileSize,
  });
  return getSignedUrl(r2, command, { expiresIn: PRESIGN_EXPIRY });
}

export async function getPresignedDownloadUrl(
  storagePath: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: storagePath,
  });
  return getSignedUrl(r2, command, { expiresIn: PRESIGN_EXPIRY });
}

export async function getObjectHead(
  storagePath: string,
): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const head = await r2.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: storagePath,
      }),
    );
    return {
      size: head.ContentLength ?? 0,
      contentType: head.ContentType,
    };
  } catch {
    return null;
  }
}

export async function deleteObject(storagePath: string): Promise<void> {
  const client = getR2Client();
  if (!client) {
    throw new Error("R2 not configured — cannot delete object");
  }
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: storagePath,
      }),
    );
  } catch (err) {
    // R2 delete failure shouldn't crash the app — log and continue
    console.error("[R2] deleteObject failed:", err);
  }
}

export function getPublicUrl(storagePath: string): string {
  return `https://${R2_BUCKET}.r2.dev/${storagePath}`;
}

export function generateStoragePath(
  entityId: string,
  fileName: string,
): string {
  const ext = fileName.split(".").pop();
  return `${entityId}/${crypto.randomUUID()}.${ext}`;
}

// ─── Allowed Types ──────────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const FILE_SIZE_LIMITS: Record<string, number> = {
  free: 5 * 1024 * 1024, // 5 MB
  starter: 10 * 1024 * 1024, // 10 MB
  business: 25 * 1024 * 1024, // 25 MB
  enterprise: 100 * 1024 * 1024, // 100 MB
};
