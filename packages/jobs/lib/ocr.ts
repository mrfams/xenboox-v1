/**
 * OCR Pipeline: pdf.js text extraction → Tesseract OCR → Claude Vision fallback
 *
 * Runs inside Trigger.dev jobs. Uses pdfjs-dist for PDF text extraction,
 * Tesseract.js for image/scanned PDF OCR, and Claude Vision API as fallback.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OcrResult {
  text: string;
  confidence: number;
  method: "pdf_text" | "tesseract" | "claude_vision";
  pageCount: number;
}

export interface OcrError {
  error: string;
  method: "pdf_text" | "tesseract" | "claude_vision";
}

// ─── Main Entry Point ──────────────────────────────────────────────────────

export async function extractText(
  buffer: Uint8Array,
  mimeType: string,
): Promise<OcrResult> {
  switch (mimeType) {
    case "application/pdf":
      return extractFromPdf(buffer);
    case "image/jpeg":
    case "image/png":
    case "image/tiff":
    case "image/webp":
      return extractFromImage(buffer, mimeType);
    case "text/csv":
      return extractFromCsv(buffer);
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.ms-excel":
      return extractFromExcel(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword":
      return extractFromWord(buffer);
    default:
      return { text: "", confidence: 0, method: "pdf_text", pageCount: 0 };
  }
}

// ─── PDF Extraction ────────────────────────────────────────────────────────

async function extractFromPdf(buffer: Uint8Array): Promise<OcrResult> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = ""; // Disable web worker in Node

    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    let fullText = "";
    let hasText = false;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as { str: string }[])
        .map((item) => item.str)
        .join(" ");
      fullText += pageText + "\n";
      if (pageText.trim().length > 10) hasText = true;
    }

    if (hasText && fullText.trim().length > 50) {
      return {
        text: fullText.trim(),
        confidence: 0.95,
        method: "pdf_text",
        pageCount: doc.numPages,
      };
    }

    // PDF has no embedded text — fall back to Tesseract on rendered pages
    return await ocrPdfPages(buffer, doc.numPages);
  } catch (error) {
    // If pdfjs fails entirely, try Tesseract on the raw bytes
    return await ocrWithTesseract(buffer, "application/pdf");
  }
}

async function ocrPdfPages(
  buffer: Uint8Array,
  pageCount: number,
): Promise<OcrResult> {
  // Scanned PDFs have no extractable text.
  // In a production environment with a canvas polyfill (e.g. @napi-rs/canvas),
  // we could render pages to images and run Tesseract on each.
  // For now, fall through to Claude Vision which handles PDFs natively.
  return await ocrWithClaudeVision(buffer, pageCount);
}

// ─── Image OCR ─────────────────────────────────────────────────────────────

async function extractFromImage(
  buffer: Uint8Array,
  _mimeType: string,
): Promise<OcrResult> {
  // Try Tesseract first (free, fast)
  const tesseractResult = await ocrWithTesseract(buffer, _mimeType);

  if (tesseractResult.confidence >= 0.7) {
    return tesseractResult;
  }

  // Low confidence — fall back to Claude Vision
  return await ocrWithClaudeVision(buffer, 1);
}

async function ocrWithTesseract(
  buffer: Uint8Array,
  _mimeType: string,
): Promise<OcrResult> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    const { data } = await worker.recognize(Buffer.from(buffer));
    await worker.terminate();

    const confidence = data.confidence / 100;

    return {
      text: data.text.trim(),
      confidence,
      method: "tesseract",
      pageCount: 1,
    };
  } catch {
    return { text: "", confidence: 0, method: "tesseract", pageCount: 0 };
  }
}

// ─── Claude Vision Fallback ────────────────────────────────────────────────

async function ocrWithClaudeVision(
  buffer: Uint8Array,
  pageCount: number,
): Promise<OcrResult> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { text: "", confidence: 0, method: "claude_vision", pageCount };
    }

    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = detectMediaType(buffer);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20250414",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text from this document exactly as written. Preserve the original formatting, columns, and structure as much as possible. Return only the extracted text with no commentary or explanation.",
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return { text: "", confidence: 0, method: "claude_vision", pageCount };
    }

    const result = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const textContent = result.content?.find(
      (c: { type: string }) => c.type === "text",
    );

    return {
      text: textContent?.text?.trim() ?? "",
      confidence: 0.92,
      method: "claude_vision",
      pageCount,
    };
  } catch {
    return { text: "", confidence: 0, method: "claude_vision", pageCount };
  }
}

// ─── CSV Extraction ────────────────────────────────────────────────────────

async function extractFromCsv(buffer: Uint8Array): Promise<OcrResult> {
  const text = new TextDecoder().decode(buffer);
  return {
    text: text.trim(),
    confidence: 1.0,
    method: "pdf_text",
    pageCount: 1,
  };
}

// ─── Excel Extraction ──────────────────────────────────────────────────────

async function extractFromExcel(buffer: Uint8Array): Promise<OcrResult> {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    let fullText = "";

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
    }

    return {
      text: fullText.trim(),
      confidence: 1.0,
      method: "pdf_text",
      pageCount: workbook.SheetNames.length,
    };
  } catch {
    return { text: "", confidence: 0, method: "pdf_text", pageCount: 0 };
  }
}

// ─── Word Extraction ───────────────────────────────────────────────────────

async function extractFromWord(buffer: Uint8Array): Promise<OcrResult> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });

    return {
      text: result.value.trim(),
      confidence: 0.98,
      method: "pdf_text",
      pageCount: 1,
    };
  } catch {
    return { text: "", confidence: 0, method: "pdf_text", pageCount: 0 };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function detectMediaType(buffer: Uint8Array): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x49 && buffer[1] === 0x49) return "image/tiff";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";
  if (buffer[0] === 0x25 && buffer[1] === 0x50) return "application/pdf";
  return "application/octet-stream";
}
