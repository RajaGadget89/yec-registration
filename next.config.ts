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
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      ...(supabaseDomain ? [{
        protocol: 'https' as const,
        hostname: supabaseDomain,
      }] : []),
      {
        protocol: 'https' as const,
        hostname: 'example.com',
      },
      {
        protocol: 'https' as const,
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
    ],
    // Increase timeout for external image optimization (30 seconds)
    // For Supabase storage signed URLs, we use unoptimized={true} to avoid timeouts
    minimumCacheTTL: 60,
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
  webpack: (config, { isServer, webpack }) => {
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
    } else {
      // Client-side: exclude Node.js-only modules from client bundle
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      
      // Exclude Node.js built-in modules from client bundle
      config.resolve.fallback['async_hooks'] = false;
      config.resolve.fallback['fs'] = false;
      config.resolve.fallback['path'] = false;
      config.resolve.fallback['crypto'] = false;
      config.resolve.fallback['stream'] = false;
      config.resolve.fallback['util'] = false;
      config.resolve.fallback['canvas'] = false;
      config.resolve.fallback['os'] = false;
      config.resolve.fallback['net'] = false;
      config.resolve.fallback['tls'] = false;
      config.resolve.fallback['child_process'] = false;
      
      // Use IgnorePlugin to completely ignore these modules on client-side
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(async_hooks|fs|path|crypto|canvas|stream|util)$/,
        })
      );
    }
    return config;
  },
  ...(isProd && {
    assetPrefix: "/",
  }),
};

export default nextConfig;

