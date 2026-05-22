import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app (a stray lockfile in the home dir was
  // making Next infer the wrong root).
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Tree-shake big icon/chart/primitive libraries so only used exports ship.
    optimizePackageImports: ["lucide-react", "recharts", "radix-ui"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.nba.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
