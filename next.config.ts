import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/icon-192x192.png',
      },
      {
        pathname: '/icon-192x192.png',
        search: '?v=2',
      },
      {
        pathname: '/icon-512x512.png',
      },
      {
        pathname: '/icon-512x512.png',
        search: '?v=2',
      },
    ],
  },
};

export default nextConfig;
