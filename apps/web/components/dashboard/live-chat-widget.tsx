"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpAssistant } from "./help-assistant";

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          isOpen
            ? "bg-muted hover:bg-muted/80"
            : "bg-primary hover:bg-primary/90 text-primary-foreground",
        )}
        aria-label={isOpen ? "Close help chat" : "Open help chat"}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[380px] max-h-[500px] rounded-xl border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-3 w-3 text-primary" />
            </div>
            <span className="text-sm font-medium">Xenboox Help</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              AI-powered support
            </span>
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(500px - 52px)" }}
          >
            <HelpAssistant />
          </div>
        </div>
      )}
    </>
  );
}
