import type { NextConfig } from "next";

const emptyModule = "./src/lib/stubs/empty-module.ts";

const optionalDepAliases: Record<string, string> = {
  porto: emptyModule,
  "@metamask/connect-evm": emptyModule,
};

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.alias = {
      ...config.resolve.alias,
      porto: false,
      "@metamask/connect-evm": false,
    };
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: optionalDepAliases,
    },
  },
};

export default nextConfig;
