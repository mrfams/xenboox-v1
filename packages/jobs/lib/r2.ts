/**
 * Shared R2 client + upload/download helpers for the jobs package.
 *
 * Every job used to construct its own S3Client inline, silently accepting
 * missing env vars (R2_ACCOUNT_ID === undefined → invalid endpoint). This
 * centralizes the client and validates the config up-front so a misconfigured
 * environment fails loudly at task start, not mid-pipeline.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 not configured — missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "xenboox-documents";

/**
 * Download an object from R2. Returns null when the object does not exist
 * (so callers can distinguish "missing" from a real failure).
 */
export async function downloadFromR2(
  storagePath: string,
): Promise<Uint8Array | null> {
  if (!storagePath) {
    throw new Error("downloadFromR2: storagePath must not be empty");
  }
  const r2 = getR2Client();
  const response = await r2.send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }),
  );
  const bytes = await response.Body?.transformToByteArray();
  return bytes ?? null;
}

/**
 * Upload a buffer to R2 and return the storage key it landed at.
 */
export async function uploadToR2(
  storagePath: string,
  data: Uint8Array,
  contentType: string,
): Promise<{ bucket: string; key: string; size: number }> {
  const r2 = getR2Client();
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storagePath,
      Body: data,
      ContentType: contentType,
    }),
  );
  return { bucket: R2_BUCKET, key: storagePath, size: data.length };
}
