/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
  // Increase proxy timeout for slow AI calls
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
