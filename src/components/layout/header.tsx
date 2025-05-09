'use client';

import Link from 'next/link';
import { Search, UserCircle, Menu } from 'lucide-react';
import Logo from '@/components/common/logo';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect, FormEvent } from 'react';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    // Set header height CSS variable
    const headerElement = document.querySelector('header');
    if (headerElement) {
      document.documentElement.style.setProperty('--header-height', `${headerElement.offsetHeight}px`);
    }
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/browse', label: 'Browse' },
    { href: '/popular', label: 'Popular' },
    { href: '/new', label: 'New' },
  ];

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>, query: string) => {
    e.preventDefault();
    if (query.trim()) {
      console.log('Searching for:', query);
      // Implement search navigation or display results here
      // Example: router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background/90 backdrop-blur-sm shadow-lg' : 'bg-transparent'
      }`}
    >
      <Container className="flex items-center justify-between py-3 sm:py-4">
        <Logo />
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center space-x-2 md:space-x-4">
          <form
            onSubmit={(e) => handleSearchSubmit(e, searchQuery)}
            className="relative hidden sm:block"
          >
            <Input
              type="search"
              placeholder="Search anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm w-40 md:w-64 bg-card border-transparent focus:border-primary focus:ring-primary"
              aria-label="Search anime"
            />
            <button type="submit" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-primary">
              <Search className="h-full w-full" />
              <span className="sr-only">Submit search</span>
            </button>
          </form>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex text-muted-foreground hover:text-primary">
            <UserCircle className="h-6 w-6" />
            <span className="sr-only">User Profile</span>
          </Button>
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card p-0 flex flex-col"> {/* Remove padding for full control */}
                <SheetHeader className="p-6 pb-4 border-b border-border"> 
                  <SheetTitle className="sr-only">Mobile Menu</SheetTitle> {/* For accessibility */}
                  <Logo />
                </SheetHeader>
                <nav className="flex flex-col space-y-2 p-6 flex-grow overflow-y-auto">
                 <form 
                    onSubmit={(e) => handleSearchSubmit(e, mobileSearchQuery)}
                    className="relative mb-4"
                  >
                    <Input
                      type="search"
                      placeholder="Search anime..."
                      value={mobileSearchQuery}
                      onChange={(e) => setMobileSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm w-full bg-background border-border focus:border-primary focus:ring-primary"
                      aria-label="Search anime mobile"
                    />
                     <button type="submit" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-primary">
                        <Search className="h-full w-full" />
                        <span className="sr-only">Submit search</span>
                    </button>
                  </form>
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="p-6 border-t border-border space-y-2">
                   <Button variant="outline" className="w-full text-foreground border-primary hover:bg-primary hover:text-primary-foreground">
                    Login
                  </Button>
                  <Button variant="default" className="w-full btn-primary-gradient">
                    Sign Up
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  );
}
