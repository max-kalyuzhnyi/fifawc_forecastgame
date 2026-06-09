import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fifawc.localhost", "*.fifawc.localhost"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
