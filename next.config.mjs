/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // imagen Docker mínima en Railway
  experimental: {
    serverActions: { bodySizeLimit: "2mb" }, // los archivos suben directo a R2, no por Server Actions
  },
  poweredByHeader: false,
};

export default nextConfig;
