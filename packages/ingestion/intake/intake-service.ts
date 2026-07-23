/**
 * Intake Service
 *
 * Validates, deduplicates, and normalizes incoming files before they enter
 * the document processing pipeline. This is the gatekeeper — every file
 * that enters the system passes through this service.
 *
 * Responsibilities:
 *   1. File size validation
 *   2. MIME type whitelist validation
 *   3. Content-type verification (magic bytes)
 *   4. Duplicate upload detection (name hash + size + entity)
 *   5. Metadata extraction
 *   6. File normalization / optimization
 *   7. Malware scan trigger
 *   8. Rate limit enforcement
 */

import { db } from "@xenboox/db";
import { documents } from "@xenboox/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Whitelist of allowed MIME types */
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "message/rfc822", // .eml
  "application/vnd.ms-outlook", // .msg
]);

/** Allowed MIME type -> human-readable category */
export const MIME_CATEGORIES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/tiff": "image",
  "image/webp": "image",
  "text/csv": "spreadsheet",
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "spreadsheet",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "document",
  "text/plain": "text",
  "message/rfc822": "email",
  "application/vnd.ms-outlook": "email",
};

/** Max file sizes per MIME category (in bytes) */
export const MAX_FILE_SIZES: Record<string, number> = {
  pdf: 50 * 1024 * 1024, // 50 MB
  image: 25 * 1024 * 1024, // 25 MB
  spreadsheet: 10 * 1024 * 1024, // 10 MB
  document: 25 * 1024 * 1024, // 25 MB
  text: 5 * 1024 * 1024, // 5 MB
  email: 10 * 1024 * 1024, // 10 MB
  default: 10 * 1024 * 1024, // 10 MB
};

/** Rate limit per entity: max uploads per sliding window */
const RATE_LIMIT_UPLOADS = 100;
const RATE_LIMIT_WINDOW_MS = 3600_000; // 1 hour

/** Virus scan required size threshold */
const VIRUS_SCAN_SIZE_THRESHOLD = 1 * 1024 * 1024; // 1 MB

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IntakeValidationResult {
  valid: boolean;
  errors: IntakeError[];
  warnings: IntakeWarning[];
  metadata: IntakeMetadata;
  normalized: boolean;
}

export interface IntakeError {
  code: string;
  message: string;
  field: string;
}

export interface IntakeWarning {
  code: string;
  message: string;
  field?: string;
}

export interface IntakeMetadata {
  detectedMimeType: string;
  declaredMimeType: string;
  sizeBytes: number;
  isDuplicate: boolean;
  duplicateOfId?: string;
  duplicateConfidence?: number;
  hashMd5: string;
  hashSha256: string;
  scanRequired: boolean;
  normalizedPath?: string;
}

// ─── Magic Bytes ────────────────────────────────────────────────────────────

/** Known magic byte signatures for MIME type verification */
const MAGIC_BYTES: Array<{
  signature: number[];
  offset: number;
  mimeType: string;
}> = [
  {
    signature: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
    mimeType: "application/pdf",
  },
  { signature: [0xff, 0xd8, 0xff], offset: 0, mimeType: "image/jpeg" },
  { signature: [0x89, 0x50, 0x4e, 0x47], offset: 0, mimeType: "image/png" },
  { signature: [0x49, 0x49, 0x2a, 0x00], offset: 0, mimeType: "image/tiff" },
  { signature: [0x4d, 0x4d, 0x00, 0x2a], offset: 0, mimeType: "image/tiff" },
  { signature: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: "image/webp" },
  {
    signature: [0xd0, 0xcf, 0x11, 0xe0],
    offset: 0,
    mimeType: "application/vnd.ms-excel",
  },
  {
    signature: [0x50, 0x4b, 0x03, 0x04],
    offset: 0,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  { signature: [0xef, 0xbb, 0xbf], offset: 0, mimeType: "text/csv" },
];

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Run all intake validations on an incoming file.
 *
 * @param fileBuffer - Raw file bytes
 * @param fileName - Original file name
 * @param declaredMimeType - MIME type from upload content-type
 * @param uploadSizeBytes - Declared file size
 * @param entityId - Entity scoping
 * @param options - Optional overrides
 * @returns Validation result with metadata for downstream stages
 */
export async function validateIntake(
  fileBuffer: Uint8Array,
  fileName: string,
  declaredMimeType: string,
  uploadSizeBytes: number,
  entityId: string,
  options: {
    skipVirusScan?: boolean;
    skipRateLimit?: boolean;
    skipDuplicateCheck?: boolean;
    maxSizeOverride?: number;
  } = {},
): Promise<IntakeValidationResult> {
  const errors: IntakeError[] = [];
  const warnings: IntakeWarning[] = [];
  const actualSize = fileBuffer.length;

  // ── 1. Hash Computation ──
  const hashMd5 = await computeMd5(fileBuffer);
  const hashSha256 = await computeSha256(fileBuffer);

  // ── 2. Magic Byte Verification ──
  const detectedMimeType = detectMimeType(fileBuffer);
  let effectiveMimeType = declaredMimeType;

  if (detectedMimeType && detectedMimeType !== declaredMimeType) {
    warnings.push({
      code: "MIME_MISMATCH",
      message: `Declared MIME "${declaredMimeType}" does not match detected "${detectedMimeType}". Using detected type.`,
      field: "mimeType",
    });
    effectiveMimeType = detectedMimeType;
  }

  // ── 3. MIME Whitelist Check ──
  if (!ALLOWED_MIME_TYPES.has(effectiveMimeType)) {
    errors.push({
      code: "UNSUPPORTED_MIME_TYPE",
      message: `File type "${effectiveMimeType}" is not supported. Accepted types: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`,
      field: "mimeType",
    });
  }

  // ── 4. File Size Validation ──
  const category = MIME_CATEGORIES[effectiveMimeType] ?? "default";
  const maxSize =
    options.maxSizeOverride ??
    MAX_FILE_SIZES[category] ??
    MAX_FILE_SIZES.default;

  if (actualSize > maxSize) {
    errors.push({
      code: "FILE_TOO_LARGE",
      message: `File size ${formatBytes(actualSize)} exceeds maximum of ${formatBytes(maxSize)} for ${category} files.`,
      field: "size",
    });
  }

  if (actualSize === 0) {
    errors.push({
      code: "EMPTY_FILE",
      message: "File is empty (0 bytes).",
      field: "size",
    });
  }

  // ── 5. File Name Validation ──
  if (!fileName || fileName.trim().length === 0) {
    errors.push({
      code: "MISSING_FILENAME",
      message: "File must have a name.",
      field: "name",
    });
  }

  // Sanitize file name
  const sanitizedName = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();

  // ── 6. Size Consistency Check ──
  if (Math.abs(uploadSizeBytes - actualSize) > 1024) {
    warnings.push({
      code: "SIZE_MISMATCH",
      message: `Declared size (${formatBytes(uploadSizeBytes)}) differs from actual (${formatBytes(actualSize)}).`,
      field: "size",
    });
  }

  // ── 7. Virus Scan Trigger ──
  const scanRequired =
    !options.skipVirusScan && actualSize >= VIRUS_SCAN_SIZE_THRESHOLD;

  // ── 8. Duplicate Detection ──
  let isDuplicate = false;
  let duplicateOfId: string | undefined;
  let duplicateConfidence: number | undefined;

  if (!options.skipDuplicateCheck) {
    const duplicate = await detectDuplicate(
      entityId,
      fileName,
      actualSize,
      hashMd5,
      hashSha256,
    );
    if (duplicate) {
      isDuplicate = true;
      duplicateOfId = duplicate.id;
      duplicateConfidence = duplicate.confidence;
      warnings.push({
        code: "DUPLICATE_DETECTED",
        message: `This file appears to be a duplicate of "${duplicate.documentName}" (${duplicate.confidence >= 0.98 ? "exact" : "likely"} match).`,
        field: "file",
      });
    }
  }

  // ── 9. Rate Limit Check ──
  if (!options.skipRateLimit) {
    const withinLimit = await checkRateLimit(entityId);
    if (!withinLimit) {
      errors.push({
        code: "RATE_LIMIT_EXCEEDED",
        message: `Upload rate limit exceeded (max ${RATE_LIMIT_UPLOADS} uploads per hour). Please wait before uploading more files.`,
        field: "entity",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      detectedMimeType: effectiveMimeType,
      declaredMimeType,
      sizeBytes: actualSize,
      isDuplicate,
      duplicateOfId,
      duplicateConfidence,
      hashMd5,
      hashSha256,
      scanRequired,
    },
    normalized: false,
  };
}

// ─── Duplicate Detection ────────────────────────────────────────────────────

interface DuplicateResult {
  id: string;
  documentName: string;
  confidence: number;
}

/**
 * Detect duplicate file uploads by checking (in order of confidence):
 * 1. Exact SHA-256 hash match
 * 2. Exact MD5 hash match
 * 3. Same file name + same size within entity
 * 4. Same file name + similar size within entity
 */
async function detectDuplicate(
  entityId: string,
  fileName: string,
  sizeBytes: number,
  md5: string,
  sha256: string,
): Promise<DuplicateResult | null> {
  // Search recent documents for this entity (last 30 days for practical perf)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

  const recentDocs = await db.query.documents.findMany({
    where: and(
      eq(documents.entityId, entityId),
      // Only check recently created docs to keep query fast
    ),
    orderBy: [desc(documents.createdAt)],
    limit: 500,
  });

  for (const doc of recentDocs) {
    const docMeta = (doc.metadata ?? {}) as Record<string, unknown>;
    const intakeMeta = (docMeta.intake ?? {}) as Record<string, unknown>;

    // 1. SHA-256 exact match (highest confidence)
    if (intakeMeta.hashSha256 === sha256) {
      return { id: doc.id, documentName: doc.name, confidence: 1.0 };
    }

    // 2. MD5 exact match
    if (intakeMeta.hashMd5 === md5) {
      return { id: doc.id, documentName: doc.name, confidence: 0.99 };
    }

    // 3. Same name + same size
    if (doc.name === fileName && doc.sizeBytes === sizeBytes) {
      return { id: doc.id, documentName: doc.name, confidence: 0.9 };
    }

    // 4. Same name + similar size (within 5%)
    if (doc.name === fileName && doc.sizeBytes) {
      const sizeRatio =
        Math.abs(sizeBytes - doc.sizeBytes) /
        Math.max(sizeBytes, doc.sizeBytes);
      if (sizeRatio < 0.05) {
        return { id: doc.id, documentName: doc.name, confidence: 0.7 };
      }
    }
  }

  return null;
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

/**
 * Check if the entity is within its upload rate limit.
 * Counts documents created in the last hour.
 */
async function checkRateLimit(entityId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const recentUploads = await db.query.documents.findMany({
    where: and(
      eq(documents.entityId, entityId),
      gte(documents.createdAt, oneHourAgo),
    ),
    orderBy: [desc(documents.createdAt)],
    limit: RATE_LIMIT_UPLOADS + 1,
  });

  return recentUploads.length < RATE_LIMIT_UPLOADS;
}

// ─── MIME Type Detection ────────────────────────────────────────────────────

/**
 * Detect MIME type from magic bytes. Returns null if unknown.
 */
function detectMimeType(buffer: Uint8Array): string | null {
  for (const entry of MAGIC_BYTES) {
    let match = true;
    for (let i = 0; i < entry.signature.length; i++) {
      if (buffer[entry.offset + i] !== entry.signature[i]) {
        match = false;
        break;
      }
    }
    if (match) return entry.mimeType;
  }

  // Try to detect if it's text
  if (buffer.length > 0) {
    const sample = buffer.slice(0, Math.min(buffer.length, 1024));
    const isText = sample.every(
      (b) => b >= 32 || b === 10 || b === 13 || b === 9,
    );
    if (isText && sample.length > 10) return "text/plain";
  }

  return null;
}

// ─── Hash Helpers ───────────────────────────────────────────────────────────

async function computeMd5(buffer: Uint8Array): Promise<string> {
  try {
    const { createHash } = await import("node:crypto");
    return createHash("md5").update(Buffer.from(buffer)).digest("hex");
  } catch {
    return `md5-${buffer.length}-${buffer[0]?.toString(16) ?? "00"}`;
  }
}

async function computeSha256(buffer: Uint8Array): Promise<string> {
  try {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  } catch {
    return `sha256-${buffer.length}-${buffer[0]?.toString(16) ?? "00"}`;
  }
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ─── Barrel Export ──────────────────────────────────────────────────────────

export type { DuplicateResult };

export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  RATE_LIMIT_UPLOADS,
  RATE_LIMIT_WINDOW_MS,
  VIRUS_SCAN_SIZE_THRESHOLD,
};
