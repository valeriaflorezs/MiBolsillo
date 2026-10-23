const r2 = "https://*.r2.cloudflarestorage.com";
const google = "https://*.googleusercontent.com"; // fotos de perfil de Google (lh3.googleusercontent.com, etc.)

// Next.js inyecta scripts inline: 'unsafe-inline' es el mínimo viable sin nonces.
// Mejora pendiente: CSP con nonce vía middleware (ver docs/manual-sistema.md).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${r2} ${google}`,
  "font-src 'self'",
  `connect-src 'self' ${r2}`, // subida directa con URL prefirmada
  `frame-src ${r2}`, // vista previa de PDFs prefirmados
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // imagen Docker mínima en Railway
  experimental: {
    serverActions: { bodySizeLimit: "2mb" }, // los archivos suben directo a R2, no por Server Actions
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
