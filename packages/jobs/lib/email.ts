// ─── Email Utility for Trigger.dev Jobs ─────────────────────────────────────
//
// Shared email sending utility for background jobs.
// Uses Resend API with graceful fallback when not configured.

import { Resend } from "resend";

function createResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  try {
    return new Resend(process.env.RESEND_API_KEY);
  } catch {
    return null;
  }
}

const resend = createResend();

const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Xenboox <noreply@xenboox.com>";

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

/**
 * Send an email via Resend.
 * Returns true on success, false on failure (non-throwing).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<boolean> {
  if (!resend) {
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
