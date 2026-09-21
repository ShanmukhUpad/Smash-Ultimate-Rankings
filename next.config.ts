import type { NextConfig } from "next";

// Set by the Pages workflow to "/<repo>". Empty for local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  basePath,
  // Emits tier-lists/index.html, which is what GitHub Pages needs to serve
  // /tier-lists/ without a 404.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
