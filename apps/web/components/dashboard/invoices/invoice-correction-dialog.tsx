"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

type InvoiceStatus =
  "draft" | "pending" | "partial" | "paid" | "overdue" | "cancelled" | "voided";

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  status: InvoiceStatus;
  notes?: string | null;
};

type CorrectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onConfirmed: () => void;
  type: "ar" | "ap";
};

const editableStatuses = ["pending", "partial", "overdue"] as const;

export function InvoiceCorrectionDialog({
  open,
  onOpenChange,
  invoice,
  onConfirmed,
  type,
}: CorrectionDialogProps) {
  const [date, setDate] = useState(invoice.invoiceDate);
  const [due, setDue] = useState(invoice.dueDate);
  const [amount, setAmount] = useState(String(invoice.totalAmount));
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [status, setStatus] = useState(invoice.status);

  useEffect(() => {
    if (open) {
      setDate(invoice.invoiceDate);
      setDue(invoice.dueDate);
      setAmount(String(invoice.totalAmount));
      setNotes(invoice.notes ?? "");
      setStatus(invoice.status);
    }
  }, [open, invoice]);

  const utils = trpc.useUtils();
  const update = trpc[type].updateInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice corrections saved");
      utils[type].getInvoiceById.invalidate({ id: invoice.id });
      utils[type].listInvoices.invalidate();
      onConfirmed();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleConfirm() {
    const parsed = parseFloat(amount);
    if (!date || !due || Number.isNaN(parsed) || parsed < 0) {
      toast.error("Please enter valid amounts and dates");
      return;
    }

    update.mutate({
      id: invoice.id,
      invoiceDate: date,
      dueDate: due,
      totalAmount: amount,
      notes: notes || undefined,
      status: ["pending", "partial", "overdue"].includes(status)
        ? (status as (typeof editableStatuses)[number])
        : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct Invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Fix extracted values before confirming. Only use for genuine
            extraction errors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Extracted date: {formatDate(invoice.invoiceDate)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Extracted date: {formatDate(invoice.dueDate)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount</Label>
            <Input
              id="totalAmount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Extracted amount: {formatCurrency(Number(invoice.totalAmount))}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional correction notes"
            />
          </div>

          {["pending", "partial", "overdue"].includes(invoice.status) && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {editableStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={update.isPending}
              className="flex-1"
            >
              Confirm Correction
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
