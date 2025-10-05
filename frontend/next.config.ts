import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: "./empty-module.ts",
      },
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
