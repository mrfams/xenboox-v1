/**
 * Batch Ingestion Page — AI-native document processing pipeline.
 *
 * Features:
 * - Batch file upload with drag-and-drop
 * - Real-time progress visualization
 * - Step-by-step status tracking
 * - Error handling and retry
 */

"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { BatchUpload } from "@/components/ingestion/batch-upload";
import { BatchProgress } from "@/components/ingestion/batch-progress";
import {
  Upload,
  History,
  Zap,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

// ─── Component ────────────────────────────────────────────────────────────

export default function IngestionPage() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState("upload");
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);

  // Fetch batch history
  const { data: batches, isLoading: batchesLoading } =
    trpc.batchIngestion.listBatches.useQuery(
      { limit: 10 },
      { enabled: !!entityId },
    );

  // Handle batch start
  const handleBatchStart = useCallback((batchId: string) => {
    setCurrentBatchId(batchId);
    setActiveTab("progress");
  }, []);

  return (
    <div className="space-y-6 p-3 pb-20">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Batch Ingestion</h1>
        <p className="text-muted-foreground">
          AI-native document processing pipeline with real-time progress
          tracking.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {batchesLoading ? "..." : (batches?.length ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Batches
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {batchesLoading
                    ? "..."
                    : (batches?.filter(
                        (b) => b.progress?.status === "completed",
                      ).length ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {batchesLoading
                    ? "..."
                    : (batches?.filter((b) => b.progress?.status === "failed")
                        .length ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {batchesLoading
                    ? "..."
                    : (batches?.filter(
                        (b) => b.progress?.status === "processing",
                      ).length ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-6">
          <BatchUpload onBatchStart={handleBatchStart} />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-6">
          {currentBatchId ? (
            <BatchProgress
              batchId={currentBatchId}
              onComplete={() => setActiveTab("history")}
            />
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active batch processing.</p>
                  <p className="text-sm mt-2">
                    Upload documents to start a new batch.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">
                Batch History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-muted rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : batches?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No batch history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches?.map((batch) => (
                    <BatchHistoryCard
                      key={batch.batchId}
                      batch={batch}
                      onClick={() => {
                        setCurrentBatchId(batch.batchId);
                        setActiveTab("progress");
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Batch History Card ───────────────────────────────────────────────────

function BatchHistoryCard({
  batch,
  onClick,
}: {
  batch: {
    batchId: string;
    createdAt: string | Date;
    progress?: {
      status: string;
      totalDocuments: number;
      completedDocuments: number;
      failedDocuments: number;
      totalDurationMs?: number;
    };
  };
  onClick: () => void;
}) {
  return (
    <div
      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              Batch {batch.batchId.slice(0, 8)}...
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(batch.createdAt).toLocaleDateString()}{" "}
              {new Date(batch.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {batch.progress && (
            <>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {batch.progress.completedDocuments}/
                  {batch.progress.totalDocuments}
                </p>
                <p className="text-xs text-muted-foreground">documents</p>
              </div>
              <Badge
                variant="secondary"
                className={`
                  ${
                    batch.progress.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : ""
                  }
                  ${
                    batch.progress.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : ""
                  }
                  ${
                    batch.progress.status === "processing"
                      ? "bg-blue-100 text-blue-800"
                      : ""
                  }
                `}
              >
                {batch.progress.status}
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
