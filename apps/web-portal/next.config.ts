import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
