import type { NextConfig } from "next";

/**
 * Lumen is a fully client-side experience: all browser data (history,
 * bookmarks, settings) lives in the user's own browser storage. There is no
 * backend, no analytics and no remote history collection.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  async headers() {
    return [
      {
        // The app embeds third-party sites; keep our own frames isolated.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
