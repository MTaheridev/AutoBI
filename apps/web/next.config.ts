import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@autobi/contracts', '@autobi/shared'],
  output: 'standalone',
};

export default nextConfig;
