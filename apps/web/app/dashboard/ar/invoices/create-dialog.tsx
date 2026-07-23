"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AccountPicker } from "@/components/dashboard/account-picker";
import { CreateDialog } from "@/components/dashboard/create-dialog";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Button,
} from "@/components/ui";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type CreateInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type LineItem = {
  description: string;
  accountId: string | null;
  quantity: string;
  unitPrice: string;
};

export function CreateInvoiceDialog({
  open,
  onOpenChange,
}: CreateInvoiceDialogProps) {
  const utils = trpc.useUtils();

  const { data: customers } = trpc.ar.listCustomers.useQuery({});

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("GMD");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", accountId: null, quantity: "", unitPrice: "" },
  ]);

  const createInvoice = trpc.ar.createInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice created");
      utils.ar.listInvoices.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setCustomerId("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setDueDate("");
    setCurrency("GMD");
    setNotes("");
    setLineItems([
      { description: "", accountId: null, quantity: "", unitPrice: "" },
    ]);
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", accountId: null, quantity: "", unitPrice: "" },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(
    index: number,
    field: keyof LineItem,
    value: string | null,
  ) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function handleSubmit() {
    if (!customerId) {
      toast.error("Customer is required");
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }
    if (!invoiceDate) {
      toast.error("Invoice date is required");
      return;
    }
    if (!dueDate) {
      toast.error("Due date is required");
      return;
    }

    const validItems = lineItems.filter(
      (item) =>
        item.description.trim() &&
        item.quantity &&
        item.unitPrice &&
        item.accountId,
    );
    if (validItems.length === 0) {
      toast.error(
        "At least one line item with description, account, quantity, and price is required",
      );
      return;
    }

    createInvoice.mutate({
      customerId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      currency,
      notes: notes.trim() || undefined,
      lines: validItems.map((item) => ({
        description: item.description.trim(),
        accountId: item.accountId!,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice).toFixed(2),
      })),
    });
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
      title="New Sales Invoice"
      description="Create a customer invoice."
      onSubmit={handleSubmit}
      isLoading={createInvoice.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice #</Label>
          <Input
            id="invoiceNumber"
            placeholder="e.g. INV-2026-001"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GMD">GMD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceNotes">Notes</Label>
          <Textarea
            id="invoiceNotes"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Line
            </Button>
          </div>

          {lineItems.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_200px_80px_100px_32px] items-end gap-2 rounded-lg border p-3"
            >
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(idx, "description", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Account</Label>
                <AccountPicker
                  value={item.accountId}
                  onChange={(v) => updateLineItem(idx, "accountId", v)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(idx, "quantity", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateLineItem(idx, "unitPrice", e.target.value)
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeLineItem(idx)}
                disabled={lineItems.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </CreateDialog>
  );
}
