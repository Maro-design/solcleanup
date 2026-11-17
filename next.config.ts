import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Token logos come from many hosts; we render them with a plain <img> and
    // a fallback, so no remote image optimisation is configured.
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // `ws` (pulled in by @solana/web3.js) optionally requires these native
  // speed-ups and works fine without them. npm sometimes leaves them out, which
  // used to crash the server build, so never bundle them.
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(Array.isArray(config.externals) ? config.externals : [config.externals]), { "utf-8-validate": "commonjs utf-8-validate", bufferutil: "commonjs bufferutil" }];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HTTPS only, for two years, once deployed (browsers ignore this on http://localhost).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
