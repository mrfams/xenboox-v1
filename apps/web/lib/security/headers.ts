import { randomBytes } from "crypto"

interface SecurityHeadersConfig {
  contentSecurityPolicy?: boolean;
  strictTransportSecurity?: boolean;
  xFrameOptions?: boolean;
  xContentTypeOptions?: boolean;
  xXSSProtection?: boolean;
  referrerPolicy?: boolean;
  permissionsPolicy?: boolean;
}

interface CSPConfig {
  nonce?: string;
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  mediaSrc?: string[];
  frameSrc?: string[];
  baseUri?: string[];
  formAction?: string[];
  frameAncestors?: string[];
  reportUri?: string;
}

export function generateNonce(): string {
  return randomBytes(16).toString("base64")
}

export function generateCSP(config: CSPConfig): string {
  const directives: string[] = [];

  if (config.defaultSrc) directives.push(`default-src ${config.defaultSrc.join(' ')}`);

  if (config.scriptSrc) {
    const scriptSrc = [...config.scriptSrc];
    if (config.nonce) scriptSrc.push(`'nonce-${config.nonce}'`);
    directives.push(`script-src ${scriptSrc.join(' ')}`);
  }

  if (config.styleSrc) {
    const styleSrc = [...config.styleSrc];
    // Next.js requires 'unsafe-inline' for CSS-in-JS; nonce added alongside for defense-in-depth
    if (config.nonce) styleSrc.push(`'nonce-${config.nonce}'`);
    directives.push(`style-src ${styleSrc.join(' ')}`);
  }

  if (config.imgSrc) directives.push(`img-src ${config.imgSrc.join(' ')}`);
  if (config.connectSrc) directives.push(`connect-src ${config.connectSrc.join(' ')}`);
  if (config.fontSrc) directives.push(`font-src ${config.fontSrc.join(' ')}`);
  if (config.objectSrc) directives.push(`object-src ${config.objectSrc.join(' ')}`);
  if (config.mediaSrc) directives.push(`media-src ${config.mediaSrc.join(' ')}`);
  if (config.frameSrc) directives.push(`frame-src ${config.frameSrc.join(' ')}`);
  if (config.baseUri) directives.push(`base-uri ${config.baseUri.join(' ')}`);
  if (config.formAction) directives.push(`form-action ${config.formAction.join(' ')}`);
  if (config.frameAncestors) directives.push(`frame-ancestors ${config.frameAncestors.join(' ')}`);
  if (config.reportUri) directives.push(`report-uri ${config.reportUri}`);

  return directives.join('; ');
}

export function buildCSP(nonce: string): string {
  return generateCSP({
    nonce,
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "https://api.anthropic.com", "https://api.openai.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", "blob:"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  })
}

export function applySecurityHeaders(
  headers: Headers,
  nonce: string,
  config: SecurityHeadersConfig = {},
): void {
  if (config.contentSecurityPolicy !== false) {
    headers.set('Content-Security-Policy', buildCSP(nonce));
  }
  if (config.strictTransportSecurity !== false) {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  if (config.xFrameOptions !== false) {
    headers.set('X-Frame-Options', 'DENY');
  }
  if (config.xContentTypeOptions !== false) {
    headers.set('X-Content-Type-Options', 'nosniff');
  }
  if (config.xXSSProtection !== false) {
    headers.set('X-XSS-Protection', '1; mode=block');
  }
  if (config.referrerPolicy !== false) {
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  if (config.permissionsPolicy !== false) {
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }
  headers.set('X-DNS-Prefetch-Control', 'off');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
}
