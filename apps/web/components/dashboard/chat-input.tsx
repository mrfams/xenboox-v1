"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ReceiptUpload } from "./receipt-upload";
import { ConnectBankDialog } from "@/components/integrations/connect-bank-dialog";
import { EmailForwardingDialog } from "@/components/integrations/email-forwarding-dialog";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Send,
  MessageSquare,
  Landmark,
  FileText,
  BookOpen,
} from "lucide-react";

interface ChatInputProps {
  onSend?: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const router = useRouter();
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [showConnectBank, setShowConnectBank] = useState(false);
  const [showEmailForwarding, setShowEmailForwarding] = useState(false);

  const suggestedPrompts = [
    {
      text: "Set up my chart of accounts for a trading business",
      icon: BookOpen,
      action: () =>
        router.push(
          "/dashboard/chat?initial=Set%20up%20my%20chart%20of%20accounts%20for%20a%20trading%20business",
        ),
    },
    {
      text: "I want to connect my bank account",
      icon: Landmark,
      action: () => setShowConnectBank(true),
    },
    {
      text: "I have invoices to upload",
      icon: FileText,
      action: () => setShowReceiptUpload(true),
    },
    {
      text: "Set up email forwarding",
      icon: MessageSquare,
      action: () => setShowEmailForwarding(true),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {suggestedPrompts.map((prompt) => {
          const Icon = prompt.icon;
          return (
            <button
              key={prompt.text}
              type="button"
              onClick={prompt.action}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <Icon className="h-3 w-3" />
              {prompt.text}
            </button>
          );
        })}
      </div>

      <ReceiptUpload
        onUploadComplete={() => {
          setShowReceiptUpload(false);
          toast.success("Document uploaded! AI is processing it now.");
        }}
      />
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
