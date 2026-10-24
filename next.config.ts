import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Large participant lists are sent to the import action as JSON.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
