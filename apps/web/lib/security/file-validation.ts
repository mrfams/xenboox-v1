// ─── File Upload Validation (§20.3 / §1.7) ─────────────────────────────────
//
// Defense in depth for document ingestion:
//   1. SANITIZE the filename — strip path separators, control chars, dotfile
//      prefixes, and anything that could traverse or poison the storage path.
//   2. CROSS-CHECK extension ↔ MIME — a client claiming application/pdf with
//      a .html filename is lying or confused; reject.
//   3. SNIFF magic bytes — the client tells us the MIME, but R2 stores what
//      the client PUTs. Verification happens server-side at confirm time and
//      again in the ingestion pipeline, using the file's actual first bytes.
//
// NEVER store SVG/HTML/executables: SVG is an XSS vector when served inline,
// HTML can phish, executables are malware delivery. They are rejected even if
// the client claims an allowed MIME.

/** Allowed extensions mapped to their canonical MIME (must match ALLOWED_MIME_TYPES). */
export const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

/** Extensions that are NEVER allowed regardless of claimed MIME. */
const FORBIDDEN_EXTENSIONS = new Set([
  "html",
  "htm",
  "svg",
  "xhtml",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "exe",
  "dll",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "vbs",
  "jsp",
  "php",
  "asp",
  "aspx",
  "jar",
  "apk",
  "msi",
  "scr",
  "com",
  "pif",
  "gadget",
]);

/** Server-side magic-byte signatures for the allowed types. */
const MAGIC_BYTES: Array<{ mime: string; match: (b: Uint8Array) => boolean }> =
  [
    {
      mime: "application/pdf",
      match: (b) =>
        b.length >= 5 &&
        b[0] === 0x25 &&
        b[1] === 0x50 &&
        b[2] === 0x44 &&
        b[3] === 0x46 &&
        b[4] === 0x2d, // %PDF-
    },
    {
      mime: "image/jpeg",
      match: (b) =>
        b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, // FF D8 FF
    },
    {
      mime: "image/png",
      match: (b) =>
        b.length >= 8 &&
        b[0] === 0x89 &&
        b[1] === 0x50 &&
        b[2] === 0x4e &&
        b[3] === 0x47 && // \x89PNG
        b[4] === 0x0d &&
        b[5] === 0x0a &&
        b[6] === 0x1a &&
        b[7] === 0x0a,
    },
    {
      mime: "image/tiff",
      match: (b) =>
        b.length >= 4 &&
        ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) || // II*\0 little-endian
          (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)), // MM\0* big-endian
    },
    {
      mime: "image/webp",
      match: (b) =>
        b.length >= 12 &&
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 && // RIFF
        b[8] === 0x57 &&
        b[9] === 0x45 &&
        b[10] === 0x42 &&
        b[11] === 0x50, // WEBP
    },
    {
      mime: "text/csv",
      match: (b) => {
        if (b.length === 0) return false;
        const head = b.slice(0, 512);
        // Reject binary (NUL-heavy) content.
        for (let i = 0; i < head.length; i++) {
          if (head[i] === 0x00) return false;
        }
        // Reject HTML/SVG/XML — a text file that starts with a markup tag is
        // NOT a CSV (and is a phishing/XSS vector when served).
        const text = new TextDecoder().decode(head).trimStart().toLowerCase();
        if (
          text.startsWith("<") &&
          /<(!doctype|html|svg|script|style|head|body|meta)\b/.test(text)
        ) {
          return false;
        }
        // CSV must look tabular — require a comma/semicolon/tab delimiter or
        // quoted field within the first chunk. Pure prose is not a CSV.
        return /[;\t,]/.test(text) || /^"[^"]*"/.test(text);
      },
    },
    // XLSX / DOCX are ZIP containers ("PK\x03\x04").
    {
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      match: (b) =>
        b.length >= 4 &&
        b[0] === 0x50 &&
        b[1] === 0x4b &&
        (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07), // PK
    },
    {
      mime: "application/vnd.ms-excel",
      match: (b) =>
        b.length >= 4 &&
        b[0] === 0x50 &&
        b[1] === 0x4b &&
        (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07), // XLS (OLE2/CFB or ZIP)
    },
    {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      match: (b) =>
        b.length >= 4 &&
        b[0] === 0x50 &&
        b[1] === 0x4b &&
        (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
    },
    {
      mime: "application/msword",
      match: (b) =>
        b.length >= 4 &&
        ((b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) || // OLE2 CFB
          (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05))), // or ZIP-based
    },
  ];

/**
 * Sanitize a client-supplied filename: strip directories, control chars, and
 * dotfile prefixes. Returns the safe basename or throws when it's unusable.
 */
export function sanitizeFileName(rawName: string): string {
  const name = rawName.replace(/\\/g, "/").split("/").pop() ?? "";
  // Strip control characters and path-y artifacts.
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^\.+/, "") // no leading dots (dotfiles / traversal)
    .trim();
  if (!cleaned) {
    throw new Error("Invalid file name");
  }
  return cleaned;
}

/** Extension (lowercased, no dot) of a sanitized filename, or "" if none. */
export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/**
 * Cross-check the filename extension against the claimed MIME type.
 * Returns true when the pair is consistent AND the extension is allowed.
 */
export function extensionMatchesMime(
  fileName: string,
  mimeType: string,
): boolean {
  const ext = getExtension(fileName);
  if (!ext) return false; // no extension — reject (can't verify)
  if (FORBIDDEN_EXTENSIONS.has(ext)) return false;
  return EXTENSION_TO_MIME[ext] === mimeType;
}

/**
 * Sniff the actual MIME type from file bytes (magic-byte detection).
 * Returns the detected MIME or null when nothing matches / content is opaque.
 */
export function sniffMimeType(buffer: Uint8Array): string | null {
  const head = buffer.slice(0, 512);
  for (const sig of MAGIC_BYTES) {
    if (sig.match(head)) return sig.mime;
  }
  return null;
}

/**
 * Verify uploaded bytes match the claimed MIME. Throws on mismatch — the
 * stored object is NOT what the client said it was.
 */
export function assertMimeMatches(
  buffer: Uint8Array,
  claimedMime: string,
): void {
  const detected = sniffMimeType(buffer);
  if (!detected) {
    throw new Error("File content could not be identified — upload rejected");
  }
  if (detected !== claimedMime) {
    throw new Error(
      `File content (${detected}) does not match the declared type (${claimedMime})`,
    );
  }
}
