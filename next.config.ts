import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: process.env.GITHUB_OWNER
      ? [
          {
            protocol: "https",
            hostname: "raw.githubusercontent.com",
            port: "",
            pathname: `/${process.env.GITHUB_OWNER}/**`,
            search: "",
          },
        ]
      : [],
  },
};

export default withBotId(nextConfig);
