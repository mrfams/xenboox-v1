// ─── Layout & Shared Components ─────────────────────────────────────────────
export { EmailLayout, DataRow, Divider, CTAButton, InfoBox, BRAND } from "./emails/_layout";
export type { EmailLayoutProps } from "./emails/_layout";

// ─── Transactional Emails ──────────────────────────────────────────────────
export { CloseCompleteEmail } from "./emails/close-complete";
export { InvoiceOverdueEmail } from "./emails/invoice-overdue";
export { AgentEscalationEmail } from "./emails/agent-escalation";
export { DailyDigestEmail } from "./emails/daily-digest";
export { DocumentUploadedEmail } from "./emails/document-uploaded";
export { DocumentProcessedEmail } from "./emails/document-processed";
export { PaymentReceivedEmail } from "./emails/payment-received";
export { PaymentSentEmail } from "./emails/payment-sent";
export { EmployeeCreatedEmail } from "./emails/employee-created";
export { AssetCreatedEmail } from "./emails/asset-created";
export { InventoryAlertEmail } from "./emails/inventory-alert";
export { PasswordResetEmail } from "./emails/password-reset";
export { VerificationEmail } from "./emails/verification-email";
export { InvitationEmail } from "./emails/invitation";
export { OnboardingWelcomeEmail } from "./emails/onboarding-welcome";
export { OnboardingDay1Email } from "./emails/onboarding-day1";
export { OnboardingDay3Email } from "./emails/onboarding-day3";
export { OnboardingDay7Email } from "./emails/onboarding-day7";
export { OnboardingDay14Email } from "./emails/onboarding-day14";
export { OnboardingDay30Email } from "./emails/onboarding-day30";

// ─── Invoice Email (new React Email template) ──────────────────────────────
export { InvoiceEmail } from "./emails/invoice-email";
