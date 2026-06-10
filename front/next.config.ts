import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/socket.io/:path*`,
      },
      {
        source: '/illustrations/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/illustrations/:path*`,
      },
      {
        source: '/avatars/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/avatars/:path*`,
      },
    ];
  },
    compiler: {
        removeConsole: true,
    }
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
