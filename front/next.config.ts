import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://transcendence42-production.up.railway.app';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
      {
        source: '/illustrations/:path*',
        destination: `${BACKEND_URL}/illustrations/:path*`,
      },
      {
        source: '/avatars/:path*',
        destination: `${BACKEND_URL}/avatars/:path*`,
      },
    ];
  },
  compiler: {
    removeConsole: true,
  }
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
