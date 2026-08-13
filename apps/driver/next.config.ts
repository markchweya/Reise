import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@reise/shared', '@reise/transit-providers'],
};

export default nextConfig;
