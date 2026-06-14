/** Dev-only CSP: Vite HMR requires 'unsafe-eval'; the bootstrap script needs 'unsafe-inline'. */
export const DEV_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "https://apis.google.com",
    "https://www.gstatic.com",
    "https://www.google.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  "connect-src 'self' ws: wss: http: https:",
  [
    "frame-src 'self' blob:",
    "https://accounts.google.com",
    "https://*.google.com",
    "https://*.firebaseapp.com",
    "https://*.web.app",
    // Firebase Auth emulator popup relay (signInWithPopup + connectAuthEmulator).
    "http://127.0.0.1:9099",
    "http://localhost:9099",
  ].join(" "),
  "worker-src 'self' blob:",
].join("; ");
