/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon.png' }];
  },
};

export default nextConfig;
