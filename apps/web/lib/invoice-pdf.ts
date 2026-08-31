/**
 * Invoice PDF Generation Service
 *
 * Generates professional, branded PDF invoices for both AR (sales) and AP (bills).
 * Uses jspdf + jspdf-autotable for table rendering.
 * Returns a Buffer that can be emailed, uploaded to R2, or streamed to the client.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ──────────────────────────────────────────────────────────────────

type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

type InvoicePdfInput = {
  /** "ar" for sales invoices, "ap" for purchase invoices */
  direction: "ar" | "ap";
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  notes?: string | null;
  // Party info
  partyName: string;
  partyEmail?: string | null;
  partyPhone?: string | null;
  partyAddress?: string | null;
  partyTaxId?: string | null;
  // Entity (business) info
  entityName: string;
  entityEmail?: string | null;
  entityAddress?: string | null;
  entityPhone?: string | null;
  // Lines
  lines: InvoiceLine[];
  // Tax (optional)
  taxRate?: number;
  taxLabel?: string;
  // Discount (optional)
  discountPercent?: number;
};

type PdfResult = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusColor(status: string): [number, number, number] {
  switch (status.toLowerCase()) {
    case "paid":
      return [34, 197, 94]; // green
    case "overdue":
      return [239, 68, 68]; // red
    case "partial":
      return [245, 158, 11]; // amber
    case "voided":
    case "cancelled":
      return [156, 163, 175]; // gray
    default:
      return [59, 130, 246]; // blue (pending)
  }
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export function generateInvoicePdf(input: InvoicePdfInput): PdfResult {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // ── Header: Entity branding ─────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(input.entityName, margin, y);
  y += 7;

  if (input.entityAddress) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(input.entityAddress, margin, y);
    y += 5;
  }
  if (input.entityEmail || input.entityPhone) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const contact = [input.entityEmail, input.entityPhone]
      .filter(Boolean)
      .join(" | ");
    doc.text(contact, margin, y);
    y += 5;
  }

  y += 4;

  // ── Invoice title + status badge ────────────────────────────────────────
  const invoiceTitle =
    input.direction === "ar" ? "SALES INVOICE" : "PURCHASE INVOICE";

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(invoiceTitle, margin, y);

  // Status badge
  const statusColor = getStatusColor(input.status);
  const statusText = input.status.toUpperCase();
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const statusWidth = doc.getTextWidth(statusText) + 6;
  const statusX = pageWidth - margin - statusWidth;
  doc.setFillColor(...statusColor);
  doc.roundedRect(statusX, y - 4, statusWidth, 6, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, statusX + 3, y);
  y += 10;

  // ── Invoice details grid ────────────────────────────────────────────────
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  // Invoice number
  doc.setFont("helvetica", "normal");
  doc.text("Invoice Number", leftCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(input.invoiceNumber, leftCol, y + 5);

  // Invoice date
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Invoice Date", rightCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(formatDate(input.invoiceDate), rightCol, y + 5);
  y += 14;

  // Due date
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Due Date", leftCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(formatDate(input.dueDate), leftCol, y + 5);

  // Currency
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Currency", rightCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(input.currency, rightCol, y + 5);
  y += 14;

  // ── Bill-to / Ship-to ───────────────────────────────────────────────────
  const billToLabel = input.direction === "ar" ? "Bill To" : "Bill From";

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text(billToLabel.toUpperCase(), margin, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(input.partyName, margin, y);
  y += 5;

  if (input.partyAddress) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(input.partyAddress, margin, y);
    y += 5;
  }
  if (input.partyEmail) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(input.partyEmail, margin, y);
    y += 5;
  }
  if (input.partyPhone) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(input.partyPhone, margin, y);
    y += 5;
  }
  if (input.partyTaxId) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Tax ID: ${input.partyTaxId}`, margin, y);
    y += 5;
  }

  y += 6;

  // ── Line items table ────────────────────────────────────────────────────
  const tableBody = input.lines.map((line) => [
    line.description,
    String(line.quantity),
    formatCurrency(line.unitPrice, input.currency),
    formatCurrency(line.amount, input.currency),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${input.entityName} — ${input.invoiceNumber}`,
        margin,
        pageH - 10,
      );
      doc.text(
        `Page ${doc.getCurrentPageInfo().pageNumber}`,
        pageWidth - margin,
        pageH - 10,
        { align: "right" },
      );
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalsX = pageWidth - margin - 70;
  const amountsX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX, y, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(input.totalAmount, input.currency), amountsX, y, {
    align: "right",
  });
  y += 7;

  // Discount (if any)
  if (input.discountPercent && input.discountPercent > 0) {
    const discountAmount = input.totalAmount * (input.discountPercent / 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Discount (${input.discountPercent}%)`, totalsX, y, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.text(
      `-${formatCurrency(discountAmount, input.currency)}`,
      amountsX,
      y,
      { align: "right" },
    );
    y += 7;
  }

  // Tax (if any)
  if (input.taxRate && input.taxRate > 0) {
    const taxAmount = input.totalAmount * (input.taxRate / 100);
    doc.setFont("helvetica", "normal");
    doc.text(input.taxLabel || `Tax (${input.taxRate}%)`, totalsX, y, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(taxAmount, input.currency), amountsX, y, {
      align: "right",
    });
    y += 7;
  }

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX, y, amountsX, y);
  y += 5;

  // Total
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Total", totalsX, y, { align: "right" });
  doc.text(formatCurrency(input.totalAmount, input.currency), amountsX, y, {
    align: "right",
  });
  y += 7;

  // Paid
  if (input.paidAmount > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(34, 197, 94);
    doc.text("Paid", totalsX, y, { align: "right" });
    doc.text(formatCurrency(input.paidAmount, input.currency), amountsX, y, {
      align: "right",
    });
    y += 7;
  }

  // Balance Due
  if (input.balance > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(239, 68, 68);
    doc.text("Balance Due", totalsX, y, { align: "right" });
    doc.text(formatCurrency(input.balance, input.currency), amountsX, y, {
      align: "right",
    });
    y += 10;
  }

  // ── Notes ───────────────────────────────────────────────────────────────
  if (input.notes) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("NOTES", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(input.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4;
  }

  // ── Payment terms footer ────────────────────────────────────────────────
  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Thank you for your business. Payment is due by the date shown above.",
    margin,
    y,
  );

  // ── Generate buffer ─────────────────────────────────────────────────────
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const prefix = input.direction === "ar" ? "Invoice" : "Bill";
  const fileName = `${prefix}-${input.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

  return {
    buffer: pdfBuffer,
    fileName,
    mimeType: "application/pdf",
  };
}

// ─── Convenience: generate AR invoice PDF from DB records ───────────────────

export async function generateSalesInvoicePdf(
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    totalAmount: string;
    paidAmount: string;
    balance: string;
    currency: string;
    notes?: string | null;
    customerId: string;
  },
  customer: {
    name: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    taxId?: string | null;
  },
  entity: {
    name: string;
    contactEmail?: string | null;
    address?: string | null;
    phone?: string | null;
  },
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>,
): Promise<PdfResult> {
  return generateInvoicePdf({
    direction: "ar",
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    currency: invoice.currency,
    totalAmount: parseFloat(invoice.totalAmount),
    paidAmount: parseFloat(invoice.paidAmount),
    balance: parseFloat(invoice.balance),
    notes: invoice.notes,
    partyName: customer.name,
    partyEmail: customer.contactEmail,
    partyPhone: customer.contactPhone,
    partyAddress: customer.address,
    partyTaxId: customer.taxId,
    entityName: entity.name,
    entityEmail: entity.contactEmail,
    entityAddress: entity.address,
    entityPhone: entity.phone,
    lines: lines.map((l) => ({
      description: l.description,
      quantity: parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice),
      amount: parseFloat(l.amount),
    })),
  });
}

// ─── Convenience: generate AP invoice PDF from DB records ───────────────────

export async function generatePurchaseInvoicePdf(
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    totalAmount: string;
    paidAmount: string;
    balance: string;
    currency: string;
    notes?: string | null;
    supplierId: string;
  },
  supplier: {
    name: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    taxId?: string | null;
  },
  entity: {
    name: string;
    contactEmail?: string | null;
    address?: string | null;
    phone?: string | null;
  },
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>,
): Promise<PdfResult> {
  return generateInvoicePdf({
    direction: "ap",
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    currency: invoice.currency,
    totalAmount: parseFloat(invoice.totalAmount),
    paidAmount: parseFloat(invoice.paidAmount),
    balance: parseFloat(invoice.balance),
    notes: invoice.notes,
    partyName: supplier.name,
    partyEmail: supplier.contactEmail,
    partyPhone: supplier.contactPhone,
    partyAddress: supplier.address,
    partyTaxId: supplier.taxId,
    entityName: entity.name,
    entityEmail: entity.contactEmail,
    entityAddress: entity.address,
    entityPhone: entity.phone,
    lines: lines.map((l) => ({
      description: l.description,
      quantity: parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice),
      amount: parseFloat(l.amount),
    })),
  });
}
