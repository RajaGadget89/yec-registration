import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// ดึงโดเมนจาก ENV หรือตั้งค่าตรง ๆ ก็ได้
const supabaseDomain = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") || "wwwzhpyvogwypmqgvtjv.supabase.co";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [supabaseDomain],
  },
  ...(isProd && {
    output: "standalone",
    assetPrefix: "/",
  }),
};

export default nextConfig;

