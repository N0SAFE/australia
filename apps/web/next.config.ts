import type { NextConfig } from "next";
import { envSchema } from "./env";

// Handle both full URLs and hostname-only values (for Render deployment)
const apiUrl = new URL(envSchema.shape.API_URL.parse(process.env.API_URL));

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${apiUrl.href}/api/auth/:path*`,
      },
      {
        source: "/api/nest/:path*",
        destination: `${apiUrl.href}/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${apiUrl.href}/storage/:path*`,
      },
    ];
  },

  /* config options here */
  reactStrictMode: true,
  
  cacheComponents: true,
  
  // Image configuration for external images
  images: {
    // Disable image optimization (Sharp not needed)
    unoptimized: true,
    // Allow remote patterns for storage images
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: '/storage/**',
      },
    ],
  },
  
  webpack: (config) => {
    // Enable polling based on env variable being set (for Docker)
    if (process.env.NEXT_WEBPACK_USEPOLLING) {
      config.watchOptions = {
        poll: 500,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  
  // Ensure output directory is writable in Docker
  distDir: '.next',
  
  // Increase body size limit for file uploads (videos, images)
  experimental: {
    // Allow up to 500MB for file uploads in server actions
    serverActions: {
      bodySizeLimit: '1000mb',
    },
    // Increase middleware body size limit for proxied requests (uploads)
    // This affects middleware like rewrites that proxy to the API
    middlewareClientMaxBodySize: '1000mb',
    // Enable global-not-found.tsx for application-wide 404 page
    globalNotFound: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
