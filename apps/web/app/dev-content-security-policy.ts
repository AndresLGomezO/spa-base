/** Dev-only CSP: Vite HMR requires 'unsafe-eval'; the bootstrap script needs 'unsafe-inline'. */
export const DEV_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  "connect-src 'self' ws: wss: http: https:",
  "worker-src 'self' blob:",
].join("; ");
