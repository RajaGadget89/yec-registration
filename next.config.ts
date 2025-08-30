import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Use environment variable for Supabase domain - no hardcoded fallback
const supabaseDomain = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "");

// Validate that the environment variable is set
if (!supabaseDomain) {
  console.warn("⚠️  NEXT_PUBLIC_SUPABASE_URL environment variable is not set");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: supabaseDomain ? [supabaseDomain] : [],
  },
  async headers() {
    return [
      {
        source: '/auth/callback',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // Remove overly broad CORS for /api/auth/callback
      // This route should be treated as same-origin in production
      // Only add CORS if cross-origin calls are actually needed
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@react-email/render': 'commonjs @react-email/render',
        '@react-email/components': 'commonjs @react-email/components',
      });
      
      // Add fallback to prevent webpack from trying to resolve these modules
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback['@react-email/render'] = false;
      config.resolve.fallback['@react-email/components'] = false;
      
      // Add alias to redirect any imports to empty modules
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['@react-email/render'] = false;
      config.resolve.alias['@react-email/components'] = false;
    }
    return config;
  },
  ...(isProd && {
    assetPrefix: "/",
  }),
};

export default nextConfig;

