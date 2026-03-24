import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Faster local image loading — skip optimization for localhost
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Reduce dev-mode overhead
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
