import { Resend } from "resend";

function createResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  try {
    return new Resend(process.env.RESEND_API_KEY);
  } catch {
    return null;
  }
}

export const resend = createResend();

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Xenboox <noreply@xenboox.com>";
