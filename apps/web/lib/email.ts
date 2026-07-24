import { render } from "@react-email/render";
import { resend, EMAIL_FROM } from "./resend";
import { CloseCompleteEmail } from "@xenboox/email";
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

// ─── Email Types ────────────────────────────────────────────────────────────

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

// ─── Base Sender ────────────────────────────────────────────────────────────

// Structured JSON logger for production use (replaces console.warn/error)
function log(level: "warn" | "error", message: string, data?: unknown) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "email",
    message,
    ...(data ? { data } : {}),
  });
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(entry);
  } else {
    // eslint-disable-next-line no-console
    console.warn(entry);
  }
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    log("warn", "RESEND_API_KEY not configured — skipping email send");
    return;
  }
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    log("error", "Failed to send email", { errorMessage: error.message });
    throw new Error(`Email send failed: ${error.message}`);
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
