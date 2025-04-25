/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src');
    return config;
  },

  // Skip export on build error
  onDemandEntries: {
    // Skip errors in specific pages
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Fix devIndicator position
  devIndicators: {
    position: 'bottom-right',
  },
  // Restore experimental config to the working version
  experimental: {
    nodeMiddleware: true
  }
};

module.exports = nextConfig;