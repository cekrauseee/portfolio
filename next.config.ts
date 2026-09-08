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
  async headers() {
    return [
      {
        source: "/countries-globe.v1.geojson",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withBotId(nextConfig);
