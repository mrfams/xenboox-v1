// Enterprise Security Headers Middleware
// Configures security headers for Next.js applications

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

/**
 * Generate Content-Security-Policy header value
 */
export function generateCSP(config: CSPConfig): string {
  const directives: string[] = [];

  if (config.defaultSrc) directives.push(`default-src ${config.defaultSrc.join(' ')}`);
  if (config.scriptSrc) directives.push(`script-src ${config.scriptSrc.join(' ')}`);
  if (config.styleSrc) directives.push(`style-src ${config.styleSrc.join(' ')}`);
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

/**
 * Default CSP configuration for Xenboox
 */
export const defaultCSP: CSPConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  connectSrc: ["'self'", 'https://api.anthropic.com', 'https://api.openai.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'", 'blob:'],
  frameSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
};

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'Content-Security-Policy': generateCSP(defaultCSP),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'off',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/**
 * Apply security headers to Next.js response
 */
export function applySecurityHeaders(headers: Headers, config: SecurityHeadersConfig = {}): void {
  if (config.contentSecurityPolicy !== false) {
    headers.set('Content-Security-Policy', securityHeaders['Content-Security-Policy']);
  }
  if (config.strictTransportSecurity !== false) {
    headers.set('Strict-Transport-Security', securityHeaders['Strict-Transport-Security']);
  }
  if (config.xFrameOptions !== false) {
    headers.set('X-Frame-Options', securityHeaders['X-Frame-Options']);
  }
  if (config.xContentTypeOptions !== false) {
    headers.set('X-Content-Type-Options', securityHeaders['X-Content-Type-Options']);
  }
  if (config.xXSSProtection !== false) {
    headers.set('X-XSS-Protection', securityHeaders['X-XSS-Protection']);
  }
  if (config.referrerPolicy !== false) {
    headers.set('Referrer-Policy', securityHeaders['Referrer-Policy']);
  }
  if (config.permissionsPolicy !== false) {
    headers.set('Permissions-Policy', securityHeaders['Permissions-Policy']);
  }
  
  // Always apply these
  headers.set('X-DNS-Prefetch-Control', securityHeaders['X-DNS-Prefetch-Control']);
  headers.set('Cross-Origin-Opener-Policy', securityHeaders['Cross-Origin-Opener-Policy']);
  headers.set('Cross-Origin-Resource-Policy', securityHeaders['Cross-Origin-Resource-Policy']);
  headers.set('Cross-Origin-Embedder-Policy', securityHeaders['Cross-Origin-Embedder-Policy']);
}

/**
 * Next.js middleware to apply security headers
 */
export function securityHeadersMiddleware(config: SecurityHeadersConfig = {}) {
  return (req: Record<string, unknown>, res: { headers: Headers }, next: () => void) => {
    applySecurityHeaders(res.headers, config);
    next();
  };
}