"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@xenboox/ui";
import {
  Download,
  Trash2,
  Shield,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

export function PrivacySection() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [exporting, setExporting] = useState(false);

  const exportData = trpc.settings.exportUserData.useMutation({
    onSuccess: (data) => {
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xenboox-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data export downloaded");
      setExporting(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export data");
      setExporting(false);
    },
  });

  const deleteAccount = trpc.settings.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deletion request received");
      setShowDeleteDialog(false);
      setDeleteConfirmation("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process deletion request");
    },
  });

  const handleExport = () => {
    setExporting(true);
    exportData.mutate();
  };

  const handleDelete = () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    deleteAccount.mutate({ confirmation: "DELETE" });
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your personal data and preferences. This
            includes your profile, settings, and activity history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  What's included in the export:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Profile information
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Appearance and notification preferences
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Activity and audit logs
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Data
          </Button>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Data Retention
          </CardTitle>
          <CardDescription>
            Information about how long we keep your data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: "Account data",
                retention: "Kept while account is active + 30 days",
                icon: Shield,
              },
              {
                type: "Financial records",
                retention: "7 years (regulatory requirement)",
                icon: FileText,
              },
              {
                type: "Audit logs",
                retention: "Indefinite (tamper-proof)",
                icon: AlertTriangle,
              },
              {
                type: "Session data",
                retention: "30 days after logout",
                icon: Shield,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.retention}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="h-4 w-4" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Warning: This is irreversible
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• All your data will be permanently deleted</li>
                  <li>• Your access to all entities will be revoked</li>
                  <li>
                    • Financial records will be retained for regulatory
                    compliance
                  </li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. Please type <strong>DELETE</strong>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Type DELETE to confirm</Label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deleteConfirmation !== "DELETE" || deleteAccount.isPending
              }
            >
              {deleteAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
