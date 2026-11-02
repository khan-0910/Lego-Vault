import type { NextConfig } from "next";

// `npm run build:pages` sets these for GitHub Pages: a static export served from /<repo>/.
const pages = process.env.PAGES === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // fetch() does not get the basePath added for it, so the catalog loader needs to know it.
  env: { NEXT_PUBLIC_BASE_PATH: pages ? basePath : "" },
  ...(pages ? { output: "export" as const, trailingSlash: true, basePath: basePath || undefined } : {}),
};

export default nextConfig;
