import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import type { NextConfig } from 'next';

// Use process.cwd() so config works when Next compiles it (avoids ESM/CJS exports issue)
const appRoot = process.cwd();

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Optimize image loading
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'appleid.cdn-apple.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    minimumCacheTTL: 60,
  },
  // Enable React strict mode for better development
  reactStrictMode: true,
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@/*': ['./src/*'],
      // Resolve tailwindcss from app root so it works when bundler context is parent dir (e.g. proxy)
      tailwindcss: path.join(appRoot, 'node_modules/tailwindcss'),
      '@tailwindcss/postcss': path.join(appRoot, 'node_modules/@tailwindcss/postcss'),
    },
  },
  // Same for webpack (e.g. next build) so resolve context never looks outside app root
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    (config.resolve.alias as Record<string, string>)['tailwindcss'] = path.join(appRoot, 'node_modules/tailwindcss');
    (config.resolve.alias as Record<string, string>)['@tailwindcss/postcss'] = path.join(appRoot, 'node_modules/@tailwindcss/postcss');
    return config;
  },
};

export default withNextIntl(nextConfig);
