/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // Determine backend URL from environment
    // Defaults to localhost:5000 if not specified
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    console.log(`[Next.js] Configuring rewrites to Backend: ${backendUrl}`);

    return [
      {
        // General API requests
        source: '/backend-api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        // SignalR hubs
        source: '/hubs/:path*',
        destination: `${backendUrl}/hubs/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

