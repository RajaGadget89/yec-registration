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
  ...(isProd && {
    assetPrefix: "/",
  }),
};

export default nextConfig;

