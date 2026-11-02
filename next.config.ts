import type { NextConfig } from "next";

// `npm run build:pages` sets these for GitHub Pages: a static export served from /<repo>/.
const pages = process.env.PAGES === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(pages ? { output: "export" as const, trailingSlash: true, basePath: basePath || undefined } : {}),
};

export default nextConfig;
