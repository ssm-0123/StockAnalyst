import type { NextConfig } from "next";
import path from "node:path";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const rawBasePath = process.env.PAGES_BASE_PATH?.trim() ?? "";
const normalizedBasePath =
  rawBasePath && rawBasePath !== "/" ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}` : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  output: isGitHubPages ? "export" : undefined,
  trailingSlash: isGitHubPages,
  assetPrefix: isGitHubPages && normalizedBasePath ? normalizedBasePath : undefined,
  basePath: isGitHubPages ? normalizedBasePath : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? normalizedBasePath : "",
    NEXT_PUBLIC_ENABLE_LIVE_QUOTES: isGitHubPages ? "false" : "true",
    NEXT_PUBLIC_STATIC_EXPORT: isGitHubPages ? "true" : "false",
  },
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
