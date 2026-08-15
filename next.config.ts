import type { NextConfig } from "next";

const allowedDevOrigins =
  process.env.DEV_ALLOWED_ORIGIN
    ? [process.env.DEV_ALLOWED_ORIGIN]
    : []

const nextConfig: NextConfig = {
  allowedDevOrigins,
}
export default nextConfig;
