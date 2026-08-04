/**
 * Document Versioning System
 *
 * Tracks document versions and provides version history.
 * Supports creating, retrieving, and comparing document versions.
 */

import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { documents } from "@xenboox/db/schema/documents";
import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────────────────

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  /** Hash of the document content for change detection */
  contentHash: string;
  /** URL/path to the versioned file */
  fileUrl: string;
  /** Size of the file in bytes */
  fileSize: number;
  /** Who created this version */
  createdBy: string;
  /** When this version was created */
  createdAt: Date;
  /** Optional change description */
  description?: string;
  /** Metadata for this version */
  metadata?: Record<string, unknown>;
}

export interface VersionDiff {
  /** Content added */
  added: string[];
  /** Content removed */
  removed: string[];
  /** Content modified */
  modified: string[];
}

// ─── Version Manager ────────────────────────────────────────────────────

export class DocumentVersionManager {
  /**
   * Create a new version of a document
   */
  async createVersion(
    documentId: string,
    fileUrl: string,
    fileSize: number,
    createdBy: string,
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<DocumentVersion> {
    // Get current version number
    const currentVersion = await this.getLatestVersion(documentId);
    const newVersionNumber = currentVersion ? currentVersion.version + 1 : 1;

    // Generate content hash (simplified - in production, hash actual content)
    const contentHash = await this.generateContentHash(fileUrl);

    // Update the main document record
    await db
      .update(documents)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Create version record (using document's metadata field)
    const versionData: DocumentVersion = {
      id: uuidv4(),
      documentId,
      version: newVersionNumber,
      contentHash,
      fileUrl,
      fileSize,
      createdBy,
      createdAt: new Date(),
      description,
      metadata,
    };

    // Store version in document's metadata
    await this.storeVersionMetadata(documentId, versionData);

    return versionData;
  }

  /**
   * Get all versions of a document
   */
  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc) return [];

    // Extract versions from metadata
    const metadata = doc.metadata as Record<string, unknown> | null;
    const versions = metadata?.versions as DocumentVersion[] | undefined;

    return versions || [];
  }

  /**
   * Get the latest version of a document
   */
  async getLatestVersion(documentId: string): Promise<DocumentVersion | null> {
    const versions = await this.getVersions(documentId);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  /**
   * Get a specific version of a document
   */
  async getVersion(
    documentId: string,
    version: number,
  ): Promise<DocumentVersion | null> {
    const versions = await this.getVersions(documentId);
    return versions.find((v) => v.version === version) || null;
  }

  /**
   * Compare two versions (simplified)
   */
  async compareVersions(
    documentId: string,
    versionA: number,
    versionB: number,
  ): Promise<VersionDiff> {
    const versions = await this.getVersions(documentId);
    const vA = versions.find((v) => v.version === versionA);
    const vB = versions.find((v) => v.version === versionB);

    if (!vA || !vB) {
      return { added: [], removed: [], modified: [] };
    }

    // Simplified diff - in production, compare actual content
    return {
      added: [],
      removed: [],
      modified: [`Version ${versionA} → ${versionB}: Content updated`],
    };
  }

  /**
   * Generate a simple content hash
   */
  private async generateContentHash(content: string): Promise<string> {
    // Simple hash - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  /**
   * Store version metadata in document
   */
  private async storeVersionMetadata(
    documentId: string,
    version: DocumentVersion,
  ): Promise<void> {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc) return;

    const currentMetadata = (doc.metadata as Record<string, unknown>) || {};
    const versions = (currentMetadata.versions as DocumentVersion[]) || [];
    versions.push(version);

    // Keep only last 50 versions
    const trimmedVersions = versions.slice(-50);

    await db
      .update(documents)
      .set({
        metadata: {
          ...currentMetadata,
          versions: trimmedVersions,
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }

  /**
   * Rollback to a previous version
   */
  async rollback(
    documentId: string,
    targetVersion: number,
    userId: string,
  ): Promise<DocumentVersion | null> {
    const target = await this.getVersion(documentId, targetVersion);
    if (!target) return null;

    // Create a new version with the old content
    return this.createVersion(
      documentId,
      target.fileUrl,
      target.fileSize,
      userId,
      `Rolled back to version ${targetVersion}`,
      { rolledBackFrom: targetVersion },
    );
  }

  /**
   * Get version statistics for a document
   */
  async getVersionStats(documentId: string): Promise<{
    totalVersions: number;
    latestVersion: number;
    totalSize: number;
    createdBy: string[];
  }> {
    const versions = await this.getVersions(documentId);

    return {
      totalVersions: versions.length,
      latestVersion:
        versions.length > 0 ? versions[versions.length - 1].version : 0,
      totalSize: versions.reduce((sum, v) => sum + v.fileSize, 0),
      createdBy: [...new Set(versions.map((v) => v.createdBy))],
    };
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────

let versionManagerInstance: DocumentVersionManager | null = null;

/**
 * Get or create the document version manager instance
 */
export function getDocumentVersionManager(): DocumentVersionManager {
  if (!versionManagerInstance) {
    versionManagerInstance = new DocumentVersionManager();
  }
  return versionManagerInstance;
}
