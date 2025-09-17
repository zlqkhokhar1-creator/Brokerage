import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if there are type errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    turbo: {
      resolveAlias: {
        "@/*": ["./src/*"],
      },
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*',
      },
      {
        source: '/landing',
        destination: '/landing/investpro-website/dist/index.html',
      },
      {
        source: '/data/:path*',
        destination: '/landing/investpro-website/dist/data/:path*',
      },
      {
        source: '/',
        destination: '/landing',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/landing/investpro-website/dist/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
