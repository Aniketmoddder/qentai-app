
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      }
    ],
  },
  // For Next.js 13+ with App Router, `fill` prop is preferred for Image component.
  // If using older Next.js or Pages Router, ensure `layout="fill"` with `objectFit` works.
  // No specific config change needed here for `fill` prop itself, but it's a coding practice update.
};

export default nextConfig;
