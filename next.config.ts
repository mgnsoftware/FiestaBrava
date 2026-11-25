import type { NextConfig } from "next";
const githubPages = process.env.GITHUB_PAGES === "true";
const nextConfig: NextConfig = {
  output: "export",
  basePath: githubPages ? "/FiestaBrava" : "",
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: { cpus: 1 },
};
export default nextConfig;
