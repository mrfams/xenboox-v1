"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import { Mail, Loader2, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface EmailForwardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailForwardingDialog({
  open,
  onOpenChange,
}: EmailForwardingProps) {
  const [sourceEmail, setSourceEmail] = useState("");
  const [forwardingAddress, setForwardingAddress] = useState<string | null>(
    null,
  );

  const createRule = trpc.integrations.createEmailRule.useMutation({
    onSuccess: (data) => {
      setForwardingAddress(data.emailAddress);
      toast.success("Email forwarding rule created!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!sourceEmail.trim()) return;
    createRule.mutate({ emailAddress: sourceEmail.trim() });
  };

  const handleCopy = () => {
    if (forwardingAddress) {
      navigator.clipboard.writeText(forwardingAddress);
      toast.success("Forwarding address copied!");
    }
  };

  const handleClose = () => {
    setSourceEmail("");
    setForwardingAddress(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Forwarding
          </DialogTitle>
          <DialogDescription>
            Forward invoices and receipts to Xenboox for automatic processing.
          </DialogDescription>
        </DialogHeader>

        {!forwardingAddress ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your source email</label>
              <input
                type="email"
                value={sourceEmail}
                onChange={(e) => setSourceEmail(e.target.value)}
                placeholder="e.g., invoices@yourcompany.com"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The email address you will forward documents from.
              </p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!sourceEmail.trim() || createRule.isPending}
              className="w-full"
            >
              {createRule.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Forwarding Address
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-2">
                Forward emails to this address:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono break-all">
                  {forwardingAddress}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-medium">How to set up:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to your email provider settings</li>
                <li>Create a forwarding rule for {sourceEmail}</li>
                <li>Set the destination to the address above</li>
                <li>Send a test email to verify</li>
              </ol>
            </div>

            <div className="rounded-lg border bg-emerald-50 p-3">
              <p className="text-xs text-emerald-800">
                Once emails arrive, AI will automatically extract
                invoice/receipt data and create document records in your
                account.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
