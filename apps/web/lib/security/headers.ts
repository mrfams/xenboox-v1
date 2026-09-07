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
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function generateCSP(config: CSPConfig): string {
  const directives: string[] = [];

  if (config.defaultSrc)
    directives.push(`default-src ${config.defaultSrc.join(" ")}`);

  if (config.scriptSrc) {
    const scriptSrc = [...config.scriptSrc];
    if (config.nonce) scriptSrc.push(`'nonce-${config.nonce}'`);
    directives.push(`script-src ${scriptSrc.join(" ")}`);
  }

  if (config.styleSrc) {
    const styleSrc = [...config.styleSrc];
    // IMPORTANT: per the CSP spec, 'unsafe-inline' is IGNORED whenever a nonce
    // or hash is present in the same directive. Adding the nonce here would
    // therefore block every React inline `style` attribute and styled-jsx tag
    // that doesn't carry the nonce, breaking the UI. Keep style-src
    // nonce-free with 'unsafe-inline' (CSS injection is low risk; this is the
    // configuration Next.js itself recommends for CSS-in-JS apps).
    directives.push(`style-src ${styleSrc.join(" ")}`);
  }

  if (config.imgSrc) directives.push(`img-src ${config.imgSrc.join(" ")}`);
  if (config.connectSrc)
    directives.push(`connect-src ${config.connectSrc.join(" ")}`);
  if (config.fontSrc) directives.push(`font-src ${config.fontSrc.join(" ")}`);
  if (config.objectSrc)
    directives.push(`object-src ${config.objectSrc.join(" ")}`);
  if (config.mediaSrc)
    directives.push(`media-src ${config.mediaSrc.join(" ")}`);
  if (config.frameSrc)
    directives.push(`frame-src ${config.frameSrc.join(" ")}`);
  if (config.baseUri) directives.push(`base-uri ${config.baseUri.join(" ")}`);
  if (config.formAction)
    directives.push(`form-action ${config.formAction.join(" ")}`);
  if (config.frameAncestors)
    directives.push(`frame-ancestors ${config.frameAncestors.join(" ")}`);
  if (config.reportUri) directives.push(`report-uri ${config.reportUri}`);

  return directives.join("; ");
}

export function buildCSP(nonce: string, selfDomain?: string): string {
  const connectSources = [
    "'self'",
    "https://api.anthropic.com",
    "https://api.openai.com",
  ];
  if (selfDomain) connectSources.push(selfDomain);

  return generateCSP({
    nonce,
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://vercel.live"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: connectSources,
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", "blob:"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  });
}

/**
 * Dev-mode CSP. Next.js dev server injects inline HMR/bootstrap scripts and
 * uses `eval` for fast-refresh source maps. A strict production CSP (no
 * 'unsafe-inline'/'unsafe-eval') blocks those, so React never hydrates and
 * every client-side page (login included) degrades to a native form GET.
 * We relax ONLY script-src in development — and critically, WITHOUT a nonce,
 * because per the CSP spec 'unsafe-inline' is ignored whenever a nonce or
 * hash is present in the source list. Production keeps the strict nonce
 * policy. All other security headers apply identically in both modes.
 */
export function buildDevCSP(): string {
  return generateCSP({
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://cdn.jsdelivr.net",
    ],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: [
      "'self'",
      "https://api.anthropic.com",
      "https://api.openai.com",
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", "blob:"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  });
}

export function applySecurityHeaders(
  headers: Headers,
  nonce: string,
  config: SecurityHeadersConfig = {},
): void {
  if (config.contentSecurityPolicy !== false) {
    const csp =
      process.env.NODE_ENV === "development" ? buildDevCSP() : buildCSP(nonce);
    headers.set("Content-Security-Policy", csp);
  }
  if (config.strictTransportSecurity !== false) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  if (config.xFrameOptions !== false) {
    headers.set("X-Frame-Options", "DENY");
  }
  if (config.xContentTypeOptions !== false) {
    headers.set("X-Content-Type-Options", "nosniff");
  }
  if (config.xXSSProtection !== false) {
    headers.set("X-XSS-Protection", "1; mode=block");
  }
  if (config.referrerPolicy !== false) {
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  if (config.permissionsPolicy !== false) {
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
  }
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
}
