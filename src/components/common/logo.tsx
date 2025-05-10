
import Link from 'next/link';
import Image from 'next/image';
import type { HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLAnchorElement> {
  iconSize?: number; 
}

export default function Logo({ className, iconSize = 12, ...props }: LogoProps) {
  // iconSize now directly influences the dimensions.
  // Approximate aspect ratio of the provided image is around 2.5:1 (width:height)
  // Let's make iconSize control the height.
  const imageHeight = iconSize * 4; // e.g. 12 * 4 = 48px height
  const imageWidth = imageHeight * 2.5; // Approximate width based on aspect ratio

  return (
    <Link href="/" className={`flex items-center ${className}`} {...props}>
      <div style={{ height: `${imageHeight}px`, width: `${imageWidth}px` }} className="relative">
        <Image
          src="https://i.ibb.co/5xnjzjr0/1000561794-removebg-preview.png"
          alt="Qentai Logo"
          fill
          style={{ objectFit: 'contain' }} 
          priority 
        />
      </div>
    </Link>
  );
}
