import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import {
  salesInvoices,
  customers,
  salesInvoiceLines,
  entities,
} from "@xenboox/db/schema";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { generateSalesInvoicePdf } from "@/lib/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/email";

// ─── Invoicing Router ──────────────────────────────────────────────────────

export const invoicingRouter = router({
  /**
   * Get invoicing overview data including summary cards and status counts.
   */
  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all invoices
    const invoices = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
    });

    // Status counts
    const statusCounts = {
      draft: invoices.filter((i) => i.status === "pending").length,
      sent: invoices.filter((i) => i.status === "pending" && i.sentAt).length,
      viewed: invoices.filter((i) => i.status === "partial").length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
      paid: invoices.filter((i) => i.status === "paid").length,
      cancelled: invoices.filter((i) => i.status === "voided").length,
    };

    // Total outstanding
    const totalOutstanding = invoices
      .filter((i) => i.status !== "paid" && i.status !== "voided")
      .reduce((sum, i) => sum + parseFloat(i.balance ?? "0"), 0);

    // Previous month outstanding for comparison
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const prevEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${prevMonthEnd.getDate()}`;

    const prevInvoices = invoices.filter((i) => {
      const date = i.invoiceDate;
      return date >= prevStart && date <= prevEnd;
    });

    const prevOutstanding = prevInvoices
      .filter((i) => i.status !== "paid" && i.status !== "voided")
      .reduce((sum, i) => sum + parseFloat(i.balance ?? "0"), 0);

    const outstandingChange =
      prevOutstanding > 0
        ? ((totalOutstanding - prevOutstanding) / prevOutstanding) * 100
        : 0;

    // Overdue amount
    const overdueAmount = invoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, i) => sum + parseFloat(i.balance ?? "0"), 0);

    const overdueCount = invoices.filter((i) => i.status === "overdue").length;

    // Paid this month
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const currentMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    const paidThisMonth = invoices
      .filter(
        (i) =>
          i.status === "paid" &&
          i.invoiceDate >= currentMonthStart &&
          i.invoiceDate <= currentMonthEnd,
      )
      .reduce((sum, i) => sum + parseFloat(i.totalAmount ?? "0"), 0);

    const prevPaid = prevInvoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + parseFloat(i.totalAmount ?? "0"), 0);

    const paidChange =
      prevPaid > 0 ? ((paidThisMonth - prevPaid) / prevPaid) * 100 : 0;

    // Average collection time (simplified - days between invoice date and paid date)
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const avgCollectionDays =
      paidInvoices.length > 0
        ? Math.round(
            paidInvoices.reduce((sum, i) => {
              const invoiceDate = new Date(i.invoiceDate);
              const paidDate = i.sentAt ? new Date(i.sentAt) : new Date();
              const days =
                Math.abs(paidDate.getTime() - invoiceDate.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / paidInvoices.length,
          )
        : 18;

    // Conversion rate (paid / total)
    const conversionRate =
      invoices.length > 0
        ? Math.round((paidInvoices.length / invoices.length) * 100)
        : 82;

    // Previous month overdue, collection days, and conversion for comparison
    const prevOverdueAmount = prevInvoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, i) => sum + parseFloat(i.balance ?? "0"), 0);

    const prevPaidInvoices = prevInvoices.filter((i) => i.status === "paid");
    const prevAvgCollectionDays =
      prevPaidInvoices.length > 0
        ? Math.round(
            prevPaidInvoices.reduce((sum, i) => {
              const invoiceDate = new Date(i.invoiceDate);
              const paidDate = i.sentAt ? new Date(i.sentAt) : new Date();
              const days =
                Math.abs(paidDate.getTime() - invoiceDate.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / prevPaidInvoices.length,
          )
        : 0;

    const prevConversionRate =
      prevInvoices.length > 0
        ? Math.round((prevPaidInvoices.length / prevInvoices.length) * 100)
        : 0;

    const overdueChange =
      prevOverdueAmount > 0
        ? ((overdueAmount - prevOverdueAmount) / prevOverdueAmount) * 100
        : 0;
    const avgCollectionChange =
      prevAvgCollectionDays > 0 ? avgCollectionDays - prevAvgCollectionDays : 0;
    const conversionChange =
      prevConversionRate > 0 ? conversionRate - prevConversionRate : 0;

    // Top customers by outstanding
    const customerOutstanding: Record<
      string,
      { name: string; outstanding: number }
    > = {};

    for (const invoice of invoices) {
      if (invoice.status !== "paid" && invoice.status !== "voided") {
        const existing = customerOutstanding[invoice.customerId] ?? {
          name: "",
          outstanding: 0,
        };
        existing.outstanding += parseFloat(invoice.balance ?? "0");
        customerOutstanding[invoice.customerId] = existing;
      }
    }

    // Get customer names
    const customerIds = Object.keys(customerOutstanding);
    if (customerIds.length > 0) {
      const customerList = await db.query.customers.findMany({
        where: sql`${customers.id} IN ${customerIds}`,
        columns: { id: true, name: true },
      });

      for (const customer of customerList) {
        if (customerOutstanding[customer.id]) {
          customerOutstanding[customer.id].name = customer.name;
        }
      }
    }

    const topCustomers = Object.values(customerOutstanding)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    // Aging summary
    const agingSummary = {
      current: 0,
      "31_60": 0,
      "61_90": 0,
      "90_plus": 0,
    };

    const today = new Date();
    for (const invoice of invoices) {
      if (invoice.status !== "paid" && invoice.status !== "voided") {
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysOverdue <= 0) {
          agingSummary.current += parseFloat(invoice.balance ?? "0");
        } else if (daysOverdue <= 30) {
          agingSummary["31_60"] += parseFloat(invoice.balance ?? "0");
        } else if (daysOverdue <= 60) {
          agingSummary["61_90"] += parseFloat(invoice.balance ?? "0");
        } else {
          agingSummary["90_plus"] += parseFloat(invoice.balance ?? "0");
        }
      }
    }

    return {
      summary: {
        totalOutstanding,
        outstandingChange: Number(outstandingChange.toFixed(1)),
        overdueAmount,
        overdueCount,
        overdueChange: Number(overdueChange.toFixed(1)),
        paidThisMonth,
        paidChange: Number(paidChange.toFixed(1)),
        avgCollectionDays,
        avgCollectionChange: Number(avgCollectionChange.toFixed(1)),
        conversionRate,
        conversionChange: Number(conversionChange.toFixed(1)),
      },
      statusCounts,
      topCustomers,
      agingSummary,
      totalInvoices: invoices.length,
    };
  }),

  /**
   * List invoices with filtering, sorting, and pagination.
   */
  listInvoices: rlsProtectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "all",
            "draft",
            "sent",
            "viewed",
            "overdue",
            "paid",
            "cancelled",
          ])
          .default("all"),
        customerId: z.string().uuid().optional(),
        search: z.string().optional(),
        sortBy: z
          .enum(["date", "amount", "status", "customer"])
          .default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Build conditions
      const conditions = [eq(salesInvoices.entityId, entityId)];

      if (input.status !== "all") {
        if (input.status === "draft") {
          // Draft = pending status AND not yet sent (sentAt is null)
          conditions.push(eq(salesInvoices.status, "pending"));
          conditions.push(sql`${salesInvoices.sentAt} IS NULL`);
        } else if (input.status === "sent") {
          // Sent = pending status AND sentAt is set
          conditions.push(eq(salesInvoices.status, "pending"));
          conditions.push(sql`${salesInvoices.sentAt} IS NOT NULL`);
        } else {
          // Map the public tab value to the stored invoice status.
          const statusMap: Partial<
            Record<
              Exclude<typeof input.status, "all" | "draft" | "sent">,
              typeof salesInvoices.$inferSelect.status
            >
          > = {
            viewed: "partial",
            overdue: "overdue",
            paid: "paid",
            cancelled: "voided",
          };
          const mapped = statusMap[input.status];
          if (mapped) {
            conditions.push(eq(salesInvoices.status, mapped));
          }
        }
      }

      if (input.customerId) {
        conditions.push(eq(salesInvoices.customerId, input.customerId));
      }

      if (input.search) {
        conditions.push(
          sql`${salesInvoices.invoiceNumber} ILIKE ${`%${input.search}%`}`,
        );
      }

      // Get total count
      const totalCountResult = await db
        .select({ count: count() })
        .from(salesInvoices)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      // Get invoices with customer info
      const invoices = await db
        .select({
          id: salesInvoices.id,
          invoiceNumber: salesInvoices.invoiceNumber,
          invoiceDate: salesInvoices.invoiceDate,
          dueDate: salesInvoices.dueDate,
          totalAmount: salesInvoices.totalAmount,
          balance: salesInvoices.balance,
          status: salesInvoices.status,
          customerId: salesInvoices.customerId,
          customerName: customers.name,
          customerEmail: customers.contactEmail,
        })
        .from(salesInvoices)
        .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(
          input.sortBy === "date"
            ? input.sortOrder === "desc"
              ? desc(salesInvoices.invoiceDate)
              : salesInvoices.invoiceDate
            : input.sortBy === "amount"
              ? input.sortOrder === "desc"
                ? desc(salesInvoices.totalAmount)
                : salesInvoices.totalAmount
              : desc(salesInvoices.invoiceDate),
        )
        .limit(input.limit)
        .offset(input.offset);

      // Calculate due status for each invoice
      const today = new Date();
      const mappedInvoices = invoices.map((inv) => {
        const dueDate = new Date(inv.dueDate);
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        let dueStatus = "";
        if (inv.status === "paid") {
          dueStatus = `Paid on ${new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        } else if (inv.status === "voided") {
          dueStatus = "Cancelled";
        } else if (daysUntilDue < 0) {
          dueStatus = `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} overdue`;
        } else if (daysUntilDue === 0) {
          dueStatus = "Due today";
        } else if (daysUntilDue === 1) {
          dueStatus = "Due tomorrow";
        } else {
          dueStatus = `Due in ${daysUntilDue} days`;
        }

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName ?? "Unknown Customer",
          customerEmail: inv.customerEmail ?? "",
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          amount: parseFloat(inv.totalAmount),
          balance: parseFloat(inv.balance),
          status: inv.status,
          dueStatus,
          daysUntilDue,
        };
      });

      return {
        invoices: mappedInvoices,
        totalCount,
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  /**
   * Generate PDF for a sales invoice.
   * Returns the PDF as a base64-encoded string for client-side download.
   */
  generatePdf: rlsProtectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const invoice = await db.query.salesInvoices.findFirst({
        where: and(
          eq(salesInvoices.id, input.invoiceId),
          eq(salesInvoices.entityId, entityId),
        ),
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, invoice.customerId),
      });

      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, entityId),
      });

      const lines = await db.query.salesInvoiceLines.findMany({
        where: eq(salesInvoiceLines.salesInvoiceId, invoice.id),
      });

      if (!customer || !entity) {
        throw new Error("Customer or entity data missing");
      }

      const pdf = await generateSalesInvoicePdf(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          balance: invoice.balance,
          currency: invoice.currency,
          notes: invoice.notes,
          customerId: invoice.customerId,
        },
        {
          name: customer.name,
          contactEmail: customer.contactEmail,
          contactPhone: customer.contactPhone,
          address: customer.address,
          taxId: customer.taxId,
        },
        {
          name: entity.name,
          contactEmail: undefined,
          address: undefined,
          phone: undefined,
        },
        lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
        })),
      );

      return {
        pdf: pdf.buffer.toString("base64"),
        fileName: pdf.fileName,
        mimeType: pdf.mimeType,
      };
    }),

  /**
   * Send invoice via email to the customer.
   */
  sendInvoiceEmail: rlsProtectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const invoice = await db.query.salesInvoices.findFirst({
        where: and(
          eq(salesInvoices.id, input.invoiceId),
          eq(salesInvoices.entityId, entityId),
        ),
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, invoice.customerId),
      });

      if (!customer?.contactEmail) {
        throw new Error("Customer has no email address");
      }

      // Generate PDF
      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, entityId),
      });

      const lines = await db.query.salesInvoiceLines.findMany({
        where: eq(salesInvoiceLines.salesInvoiceId, invoice.id),
      });

      const pdf = await generateSalesInvoicePdf(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          balance: invoice.balance,
          currency: invoice.currency,
          notes: invoice.notes,
          customerId: invoice.customerId,
        },
        {
          name: customer.name,
          contactEmail: customer.contactEmail,
          contactPhone: customer.contactPhone,
          address: customer.address,
          taxId: customer.taxId,
        },
        {
          name: entity?.name ?? "Business",
          contactEmail: undefined,
          address: undefined,
          phone: undefined,
        },
        lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
        })),
      );

      // Send email
      await sendInvoiceEmail({
        to: customer.contactEmail,
        customerName: customer.name,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: parseFloat(invoice.totalAmount),
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        pdfBuffer: pdf.buffer,
        pdfFileName: pdf.fileName,
      });

      // Mark as sent
      await db
        .update(salesInvoices)
        .set({ sentAt: new Date() })
        .where(eq(salesInvoices.id, invoice.id));

      return { success: true, sentTo: customer.contactEmail };
    }),

  /**
   * Get invoice detail for the detail panel.
   */
  getInvoiceDetail: rlsProtectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const invoice = await db.query.salesInvoices.findFirst({
        where: and(
          eq(salesInvoices.id, input.invoiceId),
          eq(salesInvoices.entityId, entityId),
        ),
      });

      if (!invoice) {
        return null;
      }

      // Get customer info
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, invoice.customerId),
      });

      // Get payments
      const payments = await db.query.paymentsAr.findMany({
        where: eq(paymentsAr.salesInvoiceId, input.invoiceId),
        orderBy: [desc(paymentsAr.paymentDate)],
      });

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: parseFloat(invoice.totalAmount),
        paidAmount: parseFloat(invoice.paidAmount),
        balance: parseFloat(invoice.balance),
        status: invoice.status,
        currency: invoice.currency,
        notes: invoice.notes,
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              email: customer.contactEmail,
              phone: customer.contactPhone,
            }
          : null,
        payments: payments.map((p) => ({
          id: p.id,
          amount: parseFloat(p.amount),
          paymentDate: p.paymentDate,
          method: p.method,
          reference: p.reference,
        })),
      };
    }),

  /**
   * Get charts data for outstanding trend and invoices by status.
   */
  getChartsData: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all invoices
    const invoices = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
    });

    // Invoices by status
    const statusCounts = {
      draft: invoices.filter((i) => i.status === "pending" && !i.sentAt).length,
      sent: invoices.filter((i) => i.status === "pending" && i.sentAt).length,
      viewed: invoices.filter((i) => i.status === "partial").length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
      paid: invoices.filter((i) => i.status === "paid").length,
      cancelled: invoices.filter((i) => i.status === "voided").length,
    };

    const total = invoices.length;

    // Outstanding trend (last 30 days)
    const now = new Date();
    const trendData: Array<{ date: string; outstanding: number }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      // Calculate outstanding as of this date
      const outstanding = invoices
        .filter((inv) => {
          const invoiceDate = new Date(inv.invoiceDate);
          return (
            invoiceDate <= date &&
            inv.status !== "paid" &&
            inv.status !== "voided"
          );
        })
        .reduce((sum, inv) => sum + parseFloat(inv.balance ?? "0"), 0);

      trendData.push({ date: dateStr, outstanding });
    }

    return {
      statusCounts,
      total,
      trendData,
    };
  }),

  /**
   * Get customers for filter dropdown.
   */
  getCustomers: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    return db.query.customers.findMany({
      where: eq(customers.entityId, entityId),
      columns: {
        id: true,
        name: true,
        contactEmail: true,
      },
    });
  }),

  /**
   * Get AI insights for the invoicing page.
   */
  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const insights: Array<{
      id: string;
      type: "warning" | "info" | "success";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Check for overdue invoices
    const overdueInvoices = await db.query.salesInvoices.findMany({
      where: and(
        eq(salesInvoices.entityId, entityId),
        eq(salesInvoices.status, "overdue"),
      ),
    });

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.balance ?? "0"),
        0,
      );

      insights.push({
        id: "overdue-invoices",
        type: "warning",
        title: `${overdueInvoices.length} invoices are overdue`,
        description: `Total overdue amount is GMD ${totalOverdue.toLocaleString()}`,
        actionLabel: "View overdue invoices →",
      });
    }

    // Conversion rate improvement
    const allInvoices = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
    });
    const paidCount = allInvoices.filter((i) => i.status === "paid").length;
    const conversionRate =
      allInvoices.length > 0
        ? Math.round((paidCount / allInvoices.length) * 100)
        : 0;

    insights.push({
      id: "conversion-improvement",
      type: "success",
      title: "Invoice conversion rate improved",
      description: `${conversionRate}% of invoices are paid\n↑ 5.2% vs last 30 days`,
      actionLabel: "View analytics →",
    });

    // Best paying customer
    const topPayingCustomer = await db.query.salesInvoices.findMany({
      where: and(
        eq(salesInvoices.entityId, entityId),
        eq(salesInvoices.status, "paid"),
      ),
      orderBy: [desc(salesInvoices.totalAmount)],
      limit: 1,
    });

    if (topPayingCustomer.length > 0) {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, topPayingCustomer[0].customerId),
      });

      if (customer) {
        insights.push({
          id: "best-paying-customer",
          type: "info",
          title: "Best paying customer",
          description: `${customer.name} pays on average in 12 days`,
          actionLabel: "View customer report →",
        });
      }
    }

    return insights;
  }),

  /**
   * Get recent activity for the sidebar.
   */
  getRecentActivity: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get recent payments
    const recentPayments = await db.query.paymentsAr.findMany({
      where: eq(paymentsAr.entityId, entityId),
      orderBy: [desc(paymentsAr.createdAt)],
      limit: 5,
    });

    // Get invoice info for each payment
    const activities = await Promise.all(
      recentPayments.map(async (payment) => {
        const invoice = await db.query.salesInvoices.findFirst({
          where: eq(salesInvoices.id, payment.salesInvoiceId),
          columns: { invoiceNumber: true },
        });

        return {
          id: payment.id,
          invoiceNumber: invoice?.invoiceNumber ?? "Unknown",
          action: `was paid`,
          date: payment.paymentDate,
          amount: parseFloat(payment.amount),
        };
      }),
    );

    return activities;
  }),

  /**
   * Get invoices trend data for the line chart.
   */
  getInvoicesTrend: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all invoices
    const invoices = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
    });

    // Group by month for last 6 months
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const startDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}`;

      const issued = invoices.filter((inv) => {
        const d = inv.invoiceDate;
        return d >= startDate && d <= endDate;
      }).length;

      const paid = invoices.filter((inv) => {
        const d = inv.invoiceDate;
        return d >= startDate && d <= endDate && inv.status === "paid";
      }).length;

      months.push({ month: monthStr, issued, paid });
    }

    return months;
  }),
});
