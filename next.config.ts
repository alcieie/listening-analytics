import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spotify requires the explicit loopback IP (not "localhost") in OAuth
  // redirect URIs, so the app is browsed at 127.0.0.1 in development. The dev
  // server only trusts localhost by default and blocks /_next/hmr from any
  // other origin, which silently breaks hot reload.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
