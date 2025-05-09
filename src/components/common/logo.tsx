import Link from 'next/link';
import { PlaySquare } from 'lucide-react'; // Using PlaySquare for a media-related icon

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-2xl font-bold ${className}`}>
      <PlaySquare className="h-8 w-8 text-primary" />
      <span className="text-primary">Qen</span><span className="text-foreground">tai</span>
    </Link>
  );
}
