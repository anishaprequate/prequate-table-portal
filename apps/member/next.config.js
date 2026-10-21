/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prequate/core", "@prequate/db"],
  // Home carries live counts (the badges on the dial), so a page the member
  // has already visited must be fetched again rather than replayed from the
  // browser's cache when they come back to it.
  experimental: { staleTimes: { dynamic: 0 } },
};

module.exports = nextConfig;
