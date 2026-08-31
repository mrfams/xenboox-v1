import { render } from "@react-email/render";
import { CloseCompleteEmail, InvoiceEmail } from "@xenboox/email";
import { InvoiceOverdueEmail } from "@xenboox/email";
import { AgentEscalationEmail } from "@xenboox/email";
import { DailyDigestEmail } from "@xenboox/email";
import { DocumentUploadedEmail, DocumentProcessedEmail } from "@xenboox/email";
import { PaymentReceivedEmail, PaymentSentEmail } from "@xenboox/email";
import { EmployeeCreatedEmail } from "@xenboox/email";
import { AssetCreatedEmail } from "@xenboox/email";
import { InventoryAlertEmail } from "@xenboox/email";
import { PasswordResetEmail } from "@xenboox/email";
import { VerificationEmail } from "@xenboox/email";
import { OnboardingWelcomeEmail } from "@xenboox/email";
import { OnboardingDay1Email } from "@xenboox/email";
import { OnboardingDay3Email } from "@xenboox/email";
import { OnboardingDay7Email } from "@xenboox/email";
import { OnboardingDay14Email } from "@xenboox/email";
import { OnboardingDay30Email } from "@xenboox/email";

import { resend, EMAIL_FROM } from "./resend";

import { logger } from "@/lib/logger";

// ─── Email Types ────────────────────────────────────────────────────────────

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

// ─── Base Sender ────────────────────────────────────────────────────────────

// Structured pino logger (service-tagged) — replaces ad-hoc console calls so
// email failures land in the same pipeline as everything else.
function log(level: "warn" | "error", message: string, data?: unknown) {
  if (level === "error") {
    logger.error({ ...(data as object) }, message);
  } else {
    logger.warn({ ...(data as object) }, message);
  }
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    log("warn", "RESEND_API_KEY not configured — skipping email send");
    return;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      if (error) {
        // Rate limit errors (429) and server errors (5xx) are retryable
        const isRetryable =
          error.message?.includes("rate") ||
          error.message?.includes("too many") ||
          error.message?.includes("timeout");

        if (isRetryable && attempt < MAX_RETRIES) {
          log("warn", `Email send rate-limited, retrying (${attempt}/${MAX_RETRIES})`, {
            subject,
            errorMessage: error.message,
          });
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }

        log("error", "Failed to send email", { errorMessage: error.message });
        throw new Error(`Email send failed: ${error.message}`);
      }

      // Success — exit retry loop
      return;
    } catch (err) {
      // Network errors are retryable
      if (attempt < MAX_RETRIES && !(err as Error).message?.includes("Email send failed")) {
        log("warn", `Email send network error, retrying (${attempt}/${MAX_RETRIES})`, {
          subject,
          errorMessage: (err as Error).message,
        });
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw err;
    }
  }
}

// ─── Template Senders ──────────────────────────────────────────────────────

export async function sendCloseCompleteEmail(
  to: string | string[],
  props: {
    entityName: string;
    month: string;
    year: number;
    reportUrl: string;
    summary: {
      revenue: string;
      expenses: string;
      netIncome: string;
      totalAssets: string;
    };
  },
) {
  const html = await render(CloseCompleteEmail(props));
  await sendEmail({
    to,
    subject: `Month-End Close Complete — ${props.entityName} ${props.month} ${props.year}`,
    html,
  });
}

export async function sendInvoiceOverdueEmail(
  to: string | string[],
  props: {
    customerName: string;
    invoiceNumber: string;
    amount: string;
    dueDate: string;
    daysOverdue: number;
    invoiceUrl: string;
  },
) {
  const html = await render(InvoiceOverdueEmail(props));
  await sendEmail({
    to,
    subject: `Invoice Overdue — ${props.invoiceNumber} from ${props.customerName}`,
    html,
  });
}

export async function sendAgentEscalationEmail(
  to: string | string[],
  props: {
    agentName: string;
    entityName: string;
    taskDescription: string;
    confidence: number;
    reasoning: string;
    reviewUrl: string;
  },
) {
  const html = await render(AgentEscalationEmail(props));
  await sendEmail({
    to,
    subject: `Agent Requires Review — ${props.agentName} (${props.entityName})`,
    html,
  });
}

export async function sendDailyDigestEmail(
  to: string | string[],
  props: {
    userName: string;
    items: Array<{
      type: string;
      count: number;
      items: Array<{ title: string; body: string }>;
    }>;
  },
) {
  const html = await render(DailyDigestEmail(props));
  await sendEmail({
    to,
    subject: `Your Daily Digest — ${new Date().toLocaleDateString()}`,
    html,
  });
}

export async function sendDocumentUploadedEmail(
  to: string | string[],
  props: {
    entityName: string;
    documentName: string;
    documentType: string;
    uploadUrl: string;
  },
) {
  const html = await render(DocumentUploadedEmail(props));
  await sendEmail({
    to,
    subject: `Document Uploaded — ${props.documentName}`,
    html,
  });
}

export async function sendDocumentProcessedEmail(
  to: string | string[],
  props: {
    entityName: string;
    documentName: string;
    status: string;
    extractedText?: string;
  },
) {
  const html = await render(DocumentProcessedEmail(props));
  await sendEmail({
    to,
    subject: `Document Processed — ${props.documentName}`,
    html,
  });
}

export async function sendPaymentReceivedEmail(
  to: string | string[],
  props: {
    customerName: string;
    invoiceNumber: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    reference?: string;
    entityName: string;
  },
) {
  const html = await render(PaymentReceivedEmail(props));
  await sendEmail({
    to,
    subject: `Payment Received — ${props.invoiceNumber} from ${props.customerName}`,
    html,
  });
}

export async function sendPaymentSentEmail(
  to: string | string[],
  props: {
    supplierName: string;
    invoiceNumber: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    reference?: string;
    entityName: string;
  },
) {
  const html = await render(PaymentSentEmail(props));
  await sendEmail({
    to,
    subject: `Payment Sent — ${props.invoiceNumber} to ${props.supplierName}`,
    html,
  });
}

export async function sendEmployeeCreatedEmail(
  to: string | string[],
  props: {
    employeeName: string;
    employeeNumber: string;
    department?: string;
    jobTitle?: string;
    hireDate: string;
    basicSalary: string;
    currency: string;
    entityName: string;
  },
) {
  const html = await render(EmployeeCreatedEmail(props));
  await sendEmail({
    to,
    subject: `New Employee Added — ${props.employeeName}`,
    html,
  });
}

export async function sendAssetCreatedEmail(
  to: string | string[],
  props: {
    assetName: string;
    assetClass: string;
    cost: string;
    currency: string;
    usefulLifeMonths: number;
    depreciationMethod: string;
    entityName: string;
  },
) {
  const html = await render(AssetCreatedEmail(props));
  await sendEmail({
    to,
    subject: `New Fixed Asset Added — ${props.assetName}`,
    html,
  });
}

export async function sendInventoryAlertEmail(
  to: string | string[],
  props: {
    itemName: string;
    sku: string;
    currentQuantity: number;
    reorderLevel: number;
    warehouseName?: string;
    entityName: string;
  },
) {
  const html = await render(InventoryAlertEmail(props));
  await sendEmail({
    to,
    subject: `Low Stock Alert — ${props.itemName} (${props.sku})`,
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  props: {
    userName: string;
    resetUrl: string;
    expiryMinutes: number;
  },
) {
  const html = await render(PasswordResetEmail(props));
  await sendEmail({
    to,
    subject: "Reset Your Xenboox Password",
    html,
  });
}

export async function sendVerificationEmail(
  to: string,
  props: {
    userName: string;
    verifyUrl: string;
    expiryMinutes: number;
  },
) {
  const html = await render(VerificationEmail(props));
  await sendEmail({
    to,
    subject: "Verify Your Xenboox Email Address",
    html,
  });
}

export async function sendInvitationEmail(
  to: string,
  props: {
    inviterName: string;
    inviterEmail: string;
    entityName: string;
    role: string;
    inviteUrl: string;
    expiresAt: string;
  },
) {
  const { InvitationEmail } = await import("@xenboox/email");
  const html = await render(InvitationEmail(props));
  await sendEmail({
    to,
    subject: `${props.inviterName} invited you to join ${props.entityName} on Xenboox`,
    html,
  });
}

/**
 * Send an invoice PDF via email as an attachment.
 * Uses the branded React Email template for the email body.
 */
export async function sendInvoiceEmail(props: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
  entityName?: string;
}) {
  const formatAmount = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: props.currency || "USD",
      minimumFractionDigits: 2,
    }).format(n);

  const dueFormatted = new Date(props.dueDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = await render(
    InvoiceEmail({
      customerName: props.customerName,
      invoiceNumber: props.invoiceNumber,
      totalAmount: formatAmount(props.totalAmount),
      currency: props.currency || "USD",
      dueDate: dueFormatted,
      entityName: props.entityName || "Your Business",
    }),
  );

  if (!resend) {
    log("warn", "RESEND_API_KEY not configured — skipping invoice email");
    return;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [props.to],
        subject: `Invoice ${props.invoiceNumber} from ${props.entityName || "Xenboox"}`,
        html,
        attachments: [
          {
            filename: props.pdfFileName,
            content: props.pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      if (error) {
        const isRetryable =
          error.message?.includes("rate") ||
          error.message?.includes("too many") ||
          error.message?.includes("timeout");

        if (isRetryable && attempt < MAX_RETRIES) {
          log("warn", `Invoice email rate-limited, retrying (${attempt}/${MAX_RETRIES})`, {
            invoiceNumber: props.invoiceNumber,
            errorMessage: error.message,
          });
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }

        log("error", "Failed to send invoice email", {
          errorMessage: error.message,
        });
        throw new Error(`Invoice email send failed: ${error.message}`);
      }

      return;
    } catch (err) {
      if (attempt < MAX_RETRIES && !(err as Error).message?.includes("Invoice email send failed")) {
        log("warn", `Invoice email network error, retrying (${attempt}/${MAX_RETRIES})`, {
          invoiceNumber: props.invoiceNumber,
          errorMessage: (err as Error).message,
        });
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw err;
    }
  }
}

// ─── Onboarding Email Sequence ────────────────────────────────────────────

export async function sendOnboardingWelcomeEmail(
  to: string,
  props: {
    userName: string;
    dashboardUrl: string;
  },
) {
  const html = await render(OnboardingWelcomeEmail(props));
  await sendEmail({
    to,
    subject: "Welcome to Xenboox! Let's get your books set up",
    html,
  });
}

export async function sendOnboardingDay1Email(
  to: string,
  props: {
    userName: string;
    dashboardUrl: string;
    hasConnectedBank: boolean;
  },
) {
  const html = await render(OnboardingDay1Email(props));
  await sendEmail({
    to,
    subject: "How's your first day going?",
    html,
  });
}

export async function sendOnboardingDay3Email(
  to: string,
  props: {
    userName: string;
    dashboardUrl: string;
    transactionsProcessed: number;
    timeSavedMinutes: number;
  },
) {
  const html = await render(OnboardingDay3Email(props));
  await sendEmail({
    to,
    subject:
      props.transactionsProcessed > 0
        ? `Your AI has processed ${props.transactionsProcessed} transactions`
        : "Have you seen your first AI insight?",
    html,
  });
}

export async function sendOnboardingDay7Email(
  to: string,
  props: {
    userName: string;
    dashboardUrl: string;
  },
) {
  const html = await render(OnboardingDay7Email(props));
  await sendEmail({
    to,
    subject: "Ready for the next level?",
    html,
  });
}

export async function sendOnboardingDay14Email(
  to: string,
  props: {
    userName: string;
    dashboardUrl: string;
    transactionsCategorized: number;
    reportsGenerated: number;
  },
) {
  const html = await render(OnboardingDay14Email(props));
  await sendEmail({
    to,
    subject: "How's Xenboox working for you?",
    html,
  });
}

export async function sendOnboardingDay30Email(
  to: string,
  props: {
    userName: string;
    dashboardUrl: string;
    transactionsCategorized: number;
    timeSavedHours: number;
  },
) {
  const html = await render(OnboardingDay30Email(props));
  await sendEmail({
    to,
    subject: "You're becoming a power user! 🎉",
    html,
  });
}
