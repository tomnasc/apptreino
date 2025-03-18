/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/workout-timer-sw.js',
        destination: '/workout-timer-sw.js',
      },
    ];
  },
};

module.exports = withPWA(nextConfig); 