
import Link from 'next/link';
import Image from 'next/image';
import type { HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLAnchorElement> {
  iconSize?: number; 
}

export default function Logo({ className, iconSize = 16, ...props }: LogoProps) { 
  // iconSize now directly influences the dimensions.
  // The new image is square (presumably, after cropping to center).
  // Let iconSize control both width and height for a square logo.
  const imageDimension = iconSize * 3; // e.g. 16 * 3 = 48px height and width

  return (
    <Link href="/" className={`flex items-center justify-center ${className}`} {...props}>
      <div style={{ height: `${imageDimension}px`, width: `${imageDimension}px` }} className="relative">
        <Image
          src="https://i.ibb.co/0VpP5jzr/Chat-GPT-Image-May-10-2025-10-50-07-AM.png"
          alt="Qentai Logo"
          fill
          style={{ objectFit: 'contain' }} 
          priority 
        />
      </div>
    </Link>
  );
}

