// ─── File Content Validation (§20.3) — ingestion pipeline ──────────────────
//
// The presigned-URL flow trusts the client's declared MIME at upload time.
// The ingestion pipeline re-verifies the ACTUAL bytes before anything reaches
// an LLM: a file that claims application/pdf but is HTML/SVG/executable is
// rejected here. Lives in @xenboox/ingestion so the jobs package (which owns
// document processing) can use it without a web-app dependency.

/** Magic-byte signatures for the document types Xenboox accepts. */
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
        b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    },
    {
      mime: "image/png",
      match: (b) =>
        b.length >= 8 &&
        b[0] === 0x89 &&
        b[1] === 0x50 &&
        b[2] === 0x4e &&
        b[3] === 0x47 &&
        b[4] === 0x0d &&
        b[5] === 0x0a &&
        b[6] === 0x1a &&
        b[7] === 0x0a,
    },
    {
      mime: "image/tiff",
      match: (b) =>
        b.length >= 4 &&
        ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
          (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)),
    },
    {
      mime: "image/webp",
      match: (b) =>
        b.length >= 12 &&
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 &&
        b[8] === 0x57 &&
        b[9] === 0x45 &&
        b[10] === 0x42 &&
        b[11] === 0x50,
    },
    {
      mime: "text/csv",
      match: (b) => {
        if (b.length === 0) return false;
        const head = b.slice(0, 512);
        for (let i = 0; i < head.length; i++) {
          if (head[i] === 0x00) return false; // binary content is not CSV
        }
        // Reject markup files (HTML/SVG/XML) — phishing/XSS vectors, not CSV.
        const text = new TextDecoder().decode(head).trimStart().toLowerCase();
        if (
          text.startsWith("<") &&
          /<(!doctype|html|svg|script|style|head|body|meta)\b/.test(text)
        ) {
          return false;
        }
        // Require a delimiter or quoted field — pure prose is not a CSV.
        return /[;\t,]/.test(text) || /^"[^"]*"/.test(text);
      },
    },
    // Office docs are ZIP containers ("PK\x03\x04" / "PK\x05\x06" empty / "PK\x07\x08").
    // ZIP-based Office formats (xlsx, docx, pptx) all share the same magic bytes.
    // We detect "zip-office" and let the caller match against their declared MIME.
    {
      mime: "zip-office",
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
        b[0] === 0xd0 &&
        b[1] === 0xcf &&
        b[2] === 0x11 &&
        b[3] === 0xe0,
    },
  ];

/** Detect the actual MIME from file bytes, or null when opaque. */
export function sniffMimeType(buffer: Uint8Array): string | null {
  const head = buffer.slice(0, 512);
  for (const sig of MAGIC_BYTES) {
    if (sig.match(head)) return sig.mime;
  }
  return null;
}

/** MIME types that are ZIP-based Office documents (all share PK magic bytes). */
const ZIP_OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

/** Throw when the actual bytes don't match the declared MIME. */
export function assertMimeMatches(
  buffer: Uint8Array,
  claimedMime: string,
): void {
  const detected = sniffMimeType(buffer);
  if (!detected) {
    throw new Error("File content could not be identified — upload rejected");
  }
  // ZIP-based Office formats all share the same magic bytes.
  // If we detected "zip-office" and the claimed MIME is a known ZIP Office type,
  // that's a match.
  if (detected === "zip-office") {
    if (ZIP_OFFICE_MIMES.has(claimedMime)) return;
    throw new Error(
      `File content (ZIP/Office archive) does not match the declared type (${claimedMime})`,
    );
  }
  if (detected !== claimedMime) {
    throw new Error(
      `File content (${detected}) does not match the declared type (${claimedMime})`,
    );
  }
}
