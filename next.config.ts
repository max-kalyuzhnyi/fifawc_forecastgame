import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import { fileURLToPath } from "url";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const projectRoot = path.dirname(
  typeof __dirname !== "undefined"
    ? __dirname
    : fileURLToPath(import.meta.url),
);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fifawc.localhost", "*.fifawc.localhost"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    root: projectRoot,
  },
};

export default withNextIntl(nextConfig);
