
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
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/aniplay123/**', // Made pathname more specific
      }
    ],
  },
  // For Next.js 13+ with App Router, `fill` prop is preferred for Image component.
  // If using older Next.js or Pages Router, ensure `layout="fill"` with `objectFit` works.
  // No specific config change needed here for `fill` prop itself, but it's a coding practice update.
};

export default nextConfig;

