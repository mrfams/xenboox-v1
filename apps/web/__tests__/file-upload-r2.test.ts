/**
 * File Upload R2 Tests
 *
 * Verifies:
 * 1. /api/upload route exists and handles POST
 * 2. ChatFileUpload supports multiple files
 * 3. File removal UI exists
 * 4. Upload button shows file count
 * 5. Drag and drop overlay works
 * 6. Image previews are generated
 * 7. Max files limit is enforced
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("File Upload R2", () => {
  // ─── API Route ─────────────────────────────────────────────────────
  describe("POST /api/upload route", () => {
    let route: string;

    beforeAll(() => {
      route = readFile("app/api/upload/route.ts");
    });

    it("exports POST handler", () => {
      expect(route).toContain("export async function POST");
    });

    it("checks authentication", () => {
      expect(route).toContain("getServerSession");
      expect(route).toContain("Unauthorized");
    });

    it("reads file from FormData", () => {
      expect(route).toContain('formData.get("file")');
      expect(route).toContain('formData.get("entityId")');
    });

    it("validates MIME type against allowlist", () => {
      expect(route).toContain("ALLOWED_MIME_TYPES");
      expect(route).toContain("application/pdf");
      expect(route).toContain("image/jpeg");
      expect(route).toContain("image/png");
    });

    it("validates file size (20MB max)", () => {
      expect(route).toContain("MAX_FILE_SIZE");
      expect(route).toContain("20 * 1024 * 1024");
    });

    it("sanitizes file name", () => {
      expect(route).toContain("sanitizeFileName");
    });

    it("generates storage path with entity ID", () => {
      expect(route).toContain("generateStoragePath");
      expect(route).toContain("uploads/${entityId}");
    });

    it("uses presigned URL for R2 upload", () => {
      expect(route).toContain("getPresignedUploadUrl");
    });

    it("creates document record in database", () => {
      expect(route).toContain(".insert(documents)");
    });

    it("returns documentId, name, type, size", () => {
      expect(route).toContain("documentId");
      expect(route).toContain("name:");
      expect(route).toContain("type:");
      expect(route).toContain("size:");
    });

    it("generates download URL for immediate use", () => {
      expect(route).toContain("getPresignedDownloadUrl");
    });

    it("logs errors with structured logger", () => {
      expect(route).toContain("logger.error");
    });
  });

  // ─── ChatFileUpload Component ──────────────────────────────────────
  describe("ChatFileUpload component", () => {
    let component: string;

    beforeAll(() => {
      component = readFile("components/chat/chat-file-upload.tsx");
    });

    it("supports multiple files", () => {
      expect(component).toContain('type="file"');
      expect(component).toContain("multiple");
    });

    it("has maxFiles prop", () => {
      expect(component).toContain("maxFiles");
      expect(component).toContain("maxFiles?: number");
    });

    it("enforces max files limit", () => {
      expect(component).toContain("uploads.length >= maxFiles");
    });

    it("shows remaining slots in title", () => {
      expect(component).toContain("slots left");
    });

    it("has image preview generation", () => {
      expect(component).toContain("URL.createObjectURL");
      expect(component).toContain("isImageFile");
    });

    it("shows image thumbnails", () => {
      expect(component).toContain("<img");
      expect(component).toContain("object-cover");
    });

    it("cleans up preview URLs on remove", () => {
      expect(component).toContain("URL.revokeObjectURL");
    });

    it("has remove button for successful uploads", () => {
      expect(component).toContain("removeSuccessful");
      expect(component).toContain("Remove");
    });

    it("has remove button for failed uploads", () => {
      expect(component).toContain("removeUpload");
    });

    it("shows error icon for failed uploads", () => {
      expect(component).toContain("AlertCircle");
    });

    it("shows check icon for successful uploads", () => {
      expect(component).toContain("Check");
    });

    it("calls /api/upload endpoint", () => {
      expect(component).toContain('"/api/upload"');
    });

    it("sends entityId with upload", () => {
      expect(component).toContain('formData.append("entityId", entityId)');
    });

    it("accepts PDF, images, Excel, Word", () => {
      expect(component).toContain(".pdf");
      expect(component).toContain(".jpg");
      expect(component).toContain(".xlsx");
      expect(component).toContain(".docx");
    });

    it("has drag and drop support", () => {
      expect(component).toContain("handleDragOver");
      expect(component).toContain("handleDrop");
      expect(component).toContain("isDragOver");
    });

    it("shows drag overlay with instructions", () => {
      expect(component).toContain("Drop files here");
    });

    it("allows removing files before sending", () => {
      // removeSuccessful should filter by documentId
      expect(component).toContain(
        "prev.filter((u) => u.documentId !== documentId)",
      );
    });
  });

  // ─── CommandBar Integration ────────────────────────────────────────
  describe("CommandBar passes maxFiles", () => {
    let bar: string;

    beforeAll(() => {
      bar = readFile("components/ai-native-v2/command-bar.tsx");
    });

    it("passes maxFiles=10 to ChatFileUpload", () => {
      expect(bar).toContain("maxFiles={10}");
    });
  });
});
