import Link from 'next/link';
import { PlaySquare } from 'lucide-react'; // Using PlaySquare for a media-related icon

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export default function Logo({ className, iconSize = 8, textSize = "text-2xl" }: LogoProps) {
  // For a combined "Qentai" look, we can adjust font weights or styles.
  // Using a common font for both parts, but could use different spans if more complex styling is needed.
  // Let's try to make "Qen" slightly bolder or a different shade if the theme supported it easily.
  // For now, we'll rely on the existing primary and foreground colors.

  return (
    <Link href="/" className={`flex items-center gap-1.5 ${className}`}>
      <PlaySquare className={`h-${iconSize} w-${iconSize} text-primary`} />
      <div className={`${textSize} font-bold flex items-baseline`}>
        <span className="text-primary">Qen</span>
        <span className="text-foreground">tai</span>
      </div>
    </Link>
  );
}
