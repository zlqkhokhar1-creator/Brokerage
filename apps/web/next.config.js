/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1',
  },
  async rewrites() {
    return [
      // Serve landing page directly
      {
        source: '/landing',
        destination: '/landing/investpro-website/dist/index.html',
      },
      // Route /data/* to the landing data files
      {
        source: '/data/:path*',
        destination: '/landing/investpro-website/dist/data/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply these headers to all landing static assets
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

module.exports = nextConfig;