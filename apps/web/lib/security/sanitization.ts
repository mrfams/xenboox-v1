import { z } from "zod"

interface SanitizationConfig {
  maxLength?: number
}

export function sanitizeText(text: string, config: SanitizationConfig = {}): string {
  let sanitized = text.trim()

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  sanitized = sanitized.replace(/[\u0000-\u001F\u200B-\u200D\uFEFF]/g, "")

  if (config.maxLength && sanitized.length > config.maxLength) {
    sanitized = sanitized.substring(0, config.maxLength)
  }

  return sanitized
}

export function sanitizeHTML(html: string): string {
  let sanitized = html

  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, "")
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, "")
  sanitized = sanitized.replace(/javascript:/gi, "")

  return sanitized
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^\w@.-]/g, "")
}

export function sanitizeURL(url: string): string {
  try {
    const urlObj = new URL(url)
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return ""
    }
    return urlObj.toString()
  } catch {
    return ""
  }
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "")
}

export function sanitizeSQLIdentifier(identifier: string): string {
  return identifier.replace(/[^a-zA-Z0-9_]/g, "")
}

export function sanitizePath(path: string): string {
  return path.replace(/\.\./g, "").replace(/[\/\\]/g, "/")
}

export function preventXSS(input: string, isHTML: boolean = false): string {
  if (isHTML) {
    return sanitizeHTML(input)
  }
  return sanitizeText(input)
}

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return sanitizeText(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  if (obj && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeText(key)] = sanitizeObject(value)
    }
    return sanitized
  }
  return obj
}

export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const sanitizedData = sanitizeObject(data)
  return schema.parse(sanitizedData)
}
