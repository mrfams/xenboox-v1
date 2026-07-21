import { generateSecret, generateURI, verifySync } from "otplib";
import { toDataURL } from "qrcode";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

export type MfaSetupData = {
  secret: string;
  qrCodeUri: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
};

const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LENGTH = 10;

export async function generateMfaSecret(email: string): Promise<MfaSetupData> {
  const secret = generateSecret();
  const serviceName = "Xenboox";
  const uri = generateURI({ issuer: serviceName, label: email, secret });
  const qrCodeDataUrl = await toDataURL(uri, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    nanoid(BACKUP_CODE_LENGTH),
  );

  return { secret, qrCodeUri: uri, qrCodeDataUrl, backupCodes };
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result !== null;
  } catch {
    return false;
  }
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

export async function verifyBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<boolean> {
  for (const hashed of hashedCodes) {
    if (await bcrypt.compare(code, hashed)) {
      return true;
    }
  }
  return false;
}

export async function removeUsedBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<string[]> {
  const remaining: string[] = [];
  let removed = false;
  for (const hashed of hashedCodes) {
    if (!removed && (await bcrypt.compare(code, hashed))) {
      removed = true;
    } else {
      remaining.push(hashed);
    }
  }
  return remaining;
}
