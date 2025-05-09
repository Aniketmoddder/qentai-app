import Container from '@/components/layout/container';
import Logo from '@/components/common/logo';
import Link from 'next/link';
import { Github, Twitter, Facebook } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border py-8 mt-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-muted-foreground">
              Your ultimate destination for anime streaming. Discover new series and enjoy your favorites.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary">About Us</Link></li>
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact</Link></li>
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Follow Us</h3>
            <div className="flex space-x-4">
              <Link href="#" aria-label="Github" className="text-muted-foreground hover:text-primary"><Github size={20} /></Link>
              <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary"><Twitter size={20} /></Link>
              <Link href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook size={20} /></Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          &copy; {currentYear} Qentai. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
