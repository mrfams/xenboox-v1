import { z } from "zod";

interface SanitizationConfig {
  maxLength?: number;
}

export function sanitizeText(
  text: string,
  config: SanitizationConfig = {},
): string {
  let sanitized = text.trim();

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  sanitized = sanitized.replace(/[\u0000-\u001F\u200B-\u200D\uFEFF]/g, "");

  if (config.maxLength && sanitized.length > config.maxLength) {
    sanitized = sanitized.substring(0, config.maxLength);
  }

  return sanitized;
}

export function sanitizeHTML(html: string): string {
  let sanitized = html;

  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  sanitized = sanitized.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    "",
  );
  sanitized = sanitized.replace(
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    "",
  );
  sanitized = sanitized.replace(
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    "",
  );
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, "");
  sanitized = sanitized.replace(
    /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
    "",
  );
  sanitized = sanitized.replace(/<base\b[^>]*>/gi, "");
  // Leftover / unclosed opening tags for executable elements (the paired
  // passes above require a closing tag; `<script>alert(1)` with no close and
  // nesting splits like `<scr<script>ipt>` slip through). A bare opening tag
  // with no matching close is inert once the tag itself is removed.
  sanitized = sanitized.replace(
    /<\/?(?:script|iframe|object|embed|applet)\b[^>]*>/gi,
    "",
  );
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, "");
  // Unquoted event handlers (`<img src=x onerror=alert(1)>`) — the HTML5
  // parser accepts them, so the quoted-only regexes above miss them. Match
  // an explicit allow-list of handler names to avoid corrupting prose
  // (e.g. "once=upon") while still stripping every executable handler.
  sanitized = sanitized.replace(
    /\son(?:load|error|click|dblclick|mouse(?:over|out|down|up|move|enter|leave)|key(?:down|up|press)|focus|blur|change|submit|reset|input|contextmenu|touch(?:start|end|move|cancel)|drag(?:start|end|enter|leave|over)|drop|scroll|wheel|pointer(?:down|up|move|over|out|enter|leave|cancel)|auxclick|animation(?:start|end|iteration)|transition(?:start|end|run|cancel))\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`=]+)/gi,
    "",
  );
  sanitized = sanitized.replace(/javascript:/gi, "");
  // javascript: URLs in href/src (incl. unquoted and with whitespace
  // between the attribute name, `=`, and the scheme).
  sanitized = sanitized.replace(
    /(href|src|action|formaction)\s*=\s*(?:"|')?\s*javascript:[^"'\s>]*/gi,
    "",
  );
  // Entity-encoded javascript: — browsers decode &#106; / &#97; before
  // resolving a URL, so normalize the scheme letters then re-strip. Only
  // the two letters used in the common partial encodings are decoded (j, a)
  // — enough to neutralize `&#106;avascript:` and `&#106;&#97;vascript:`
  // without mangling arbitrary numeric entities in prose.
  sanitized = sanitized.replace(/&#(?:x0*6a|0*106|X0*6A);/g, "j");
  sanitized = sanitized.replace(/&#(?:x0*61|0*97|X0*61);/g, "a");
  sanitized = sanitized.replace(/javascript:/gi, "");

  return sanitized;
}

export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^\w@.-]/g, "");
}

export function sanitizeURL(url: string): string {
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return "";
    }
    return urlObj.toString();
  } catch {
    return "";
  }
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function sanitizeSQLIdentifier(identifier: string): string {
  return identifier.replace(/[^a-zA-Z0-9_]/g, "");
}

export function sanitizePath(path: string): string {
  return path.replace(/\.\./g, "").replace(/[\\/]/g, "/");
}

export function preventXSS(input: string, isHTML: boolean = false): string {
  if (isHTML) {
    return sanitizeHTML(input);
  }
  return sanitizeText(input);
}

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return sanitizeText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeText(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  const sanitizedData = sanitizeObject(data);
  return schema.parse(sanitizedData);
}
