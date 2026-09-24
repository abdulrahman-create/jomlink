import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal, self-contained production build for Docker/VPS deployment.
  // `next start` inside .next/standalone serves the app; static assets are
  // copied into the output automatically. See Dockerfile (multi-stage build).
  output: "standalone",
};

export default nextConfig;
