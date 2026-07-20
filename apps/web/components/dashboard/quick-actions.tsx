"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  Upload,
  FileText,
  CreditCard,
  Building2,
  Mail,
  Camera,
} from "lucide-react";
import { ReceiptUpload } from "./receipt-upload";
import { ConnectBankDialog } from "@/components/integrations/connect-bank-dialog";
import { EmailForwardingDialog } from "@/components/integrations/email-forwarding-dialog";

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const router = useRouter();
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [showConnectBank, setShowConnectBank] = useState(false);
  const [showEmailForwarding, setShowEmailForwarding] = useState(false);

  const actions = [
    {
      id: "upload-receipt",
      label: "Upload Receipt",
      description: "Snap or upload a receipt for AI processing",
      icon: Camera,
      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      handler: () => setShowReceiptUpload(true),
    },
    {
      id: "upload-invoice",
      label: "Upload Invoice",
      description: "Upload a supplier invoice",
      icon: FileText,
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
      handler: () => setShowReceiptUpload(true),
    },
    {
      id: "connect-bank",
      label: "Connect Bank",
      description: "Link your bank account via Mono",
      icon: CreditCard,
      color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
      handler: () => setShowConnectBank(true),
    },
    {
      id: "upload-statement",
      label: "Upload Statement",
      description: "Import a CSV or PDF bank statement",
      icon: Building2,
      color: "bg-amber-50 text-amber-700 hover:bg-amber-100",
      handler: () => setShowReceiptUpload(true),
    },
    {
      id: "forward-email",
      label: "Email Forwarding",
      description: "Set up email-to-Xenboox forwarding",
      icon: Mail,
      color: "bg-rose-50 text-rose-700 hover:bg-rose-100",
      handler: () => setShowEmailForwarding(true),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            className={`h-auto flex-col gap-2 p-4 ${action.color} border-0`}
            onClick={action.handler}
          >
            <action.icon className="h-5 w-5" />
            <div className="text-center">
              <p className="text-sm font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {action.description}
              </p>
            </div>
          </Button>
        ))}
      </div>

      {/* Dialogs */}
      <Dialog open={showReceiptUpload} onOpenChange={setShowReceiptUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <ReceiptUpload
            onUploadComplete={() => {
              setShowReceiptUpload(false);
              onAction?.("document-uploaded");
            }}
          />
        </DialogContent>
      </Dialog>

      <ConnectBankDialog
        open={showConnectBank}
        onOpenChange={setShowConnectBank}
      />
      <EmailForwardingDialog
        open={showEmailForwarding}
        onOpenChange={setShowEmailForwarding}
      />
    </>
  );
}
