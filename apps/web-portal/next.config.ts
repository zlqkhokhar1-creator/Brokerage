import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    reactCompiler: true,
    optimizePackageImports: ['lucide-react', '@mantine/core', 'framer-motion'],
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      // Optimize build performance by reducing cache serialization
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    // Optimize large string handling
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };

    return config;
  },
};

export default nextConfig;
