import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Developer indicators: hide the bottom-left Next.js build/activity badge in dev
  devIndicators: {
    buildActivity: false,
  },
  trailingSlash: true,
};

export default nextConfig;
