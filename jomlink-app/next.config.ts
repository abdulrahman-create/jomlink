import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal, self-contained production build for Docker/VPS deployment.
  // `next start` inside .next/standalone serves the app; static assets are
  // copied into the output automatically. See Dockerfile (multi-stage build).
  output: "standalone",

  // Allow the dev server to be reached from non-localhost origins.
  // Hosts only — no scheme, no port, no path.
  // Used by the test team over the Tailscale network.
  //   • 100.121.116.99          — Tailscale IP of the dev machine
  //   • *.ts.net / hosts        — add your Tailscale MagicDNS name if used
  // Add every origin that browser requests will come from in development.
  allowedDevOrigins: [
    "100.121.116.99",
    "*.ts.net",
  ],
};

export default nextConfig;
