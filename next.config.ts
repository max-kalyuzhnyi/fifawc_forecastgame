import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(
  typeof __dirname !== "undefined"
    ? __dirname
    : fileURLToPath(import.meta.url),
);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fifawc.localhost", "*.fifawc.localhost"],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
