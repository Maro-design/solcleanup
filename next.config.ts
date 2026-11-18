import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  // Preview images rendered on demand read Geist from node_modules at runtime;
  // file tracing can't see that, so ship the font files with those functions.
  outputFileTracingIncludes: {
    "/check/**": [
      "./node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf",
      "./node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf",
      "./node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf",
    ],
  },
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
