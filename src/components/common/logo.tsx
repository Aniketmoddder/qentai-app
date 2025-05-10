
import Link from 'next/link';
import type { SVGProps } from 'react';

interface LogoProps {
  className?: string;
  iconSize?: number; // This will now control the overall size of the SVG
  textSize?: string; // Text size will be relative to iconSize or fixed within SVG
}

function QentaiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em" // Use em unit to scale with parent font size or iconSize prop
      height="1em"
      viewBox="0 0 100 100" // Adjusted viewBox for a square icon
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="100" height="100" rx="20" fill="hsl(var(--primary))" />
      <path
        d="M50 25C36.1929 25 25 36.1929 25 50C25 63.8071 36.1929 75 50 75C58.6172 75 66.0537 70.0907 70.1337 62.5M50 25C56.0588 25 61.5806 27.4779 65.617 31.4245M50 25V50H75"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="10" // Increased stroke width for visibility
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M65 56L45 78" // Adjusted coordinates for the red slash
        stroke="hsl(var(--destructive))" // Using destructive for red
        strokeWidth="8" // Adjusted stroke width for the slash
        strokeLinecap="round"
      />
    </svg>
  );
}


export default function Logo({ className, iconSize = 8, textSize = "text-2xl" }: LogoProps) {
  const effectiveSize = `${iconSize * 0.25}rem`; // Convert iconSize (number) to rem string for SVG

  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <QentaiIcon style={{ width: effectiveSize, height: effectiveSize }} />
      <span className={`${textSize} font-bold text-primary`}>
        Qentai
      </span>
    </Link>
  );
}
