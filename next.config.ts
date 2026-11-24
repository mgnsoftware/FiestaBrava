import type { NextConfig } from "next";
const adminPath = (process.env.ADMIN_PATH || "admin-la-fiesta").replace(/^\/+|\/+$/g, "");
const nextConfig: NextConfig = {
  experimental: { cpus: 1 },
  async rewrites() {
    if (adminPath === "admin-la-fiesta") return [];
    return { beforeFiles: [{ source: `/${adminPath}/:path*`, destination: "/admin-la-fiesta/:path*" }] };
  },
};
export default nextConfig;
