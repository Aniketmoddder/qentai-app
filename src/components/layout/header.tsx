
'use client';

import Link from 'next/link';
import { Search, UserCircle, Menu, LogOut, LogIn, UserPlus, User as UserIcon } from 'lucide-react';
import Logo from '@/components/common/logo';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';


export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    const headerElement = document.querySelector('header');
    if (headerElement) {
      document.documentElement.style.setProperty('--header-height', `${headerElement.offsetHeight}px`);
    }
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/browse', label: 'Browse' }, 
  ];

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>, query: string) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchQuery(''); 
      setMobileSearchQuery('');
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/'); 
    } catch (error) {
      console.error("Logout failed", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log out. Please try again." });
    }
  };

  const getAvatarFallback = (email?: string | null) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  }

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background/90 backdrop-blur-sm shadow-lg' : 'bg-background/80 md:bg-transparent'
      }`}
    >
      <Container className="flex items-center justify-between py-3 sm:py-4">
        <Logo />
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-sm font-medium hover:text-primary transition-colors ${pathname === item.href ? 'text-primary' : 'text-muted-foreground'}`}
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
              className="pl-10 pr-4 py-2 text-sm w-40 md:w-56 bg-card border-transparent focus:border-primary focus:ring-primary"
              aria-label="Search anime"
            />
            <button type="submit" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-primary">
              <Search className="h-full w-full" />
              <span className="sr-only">Submit search</span>
            </button>
          </form>

          {!authLoading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>{getAvatarFallback(user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {/* 
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator /> 
                */}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !authLoading && !user ? (
             <div className="hidden md:flex items-center space-x-2">
                <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
                    <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="btn-primary-gradient">
                    <Link href="/register">Sign Up</Link>
                </Button>
            </div>
          ) : authLoading ? (
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ): null }

          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card p-0 flex flex-col w-[85vw] max-w-xs sm:max-w-sm">
                <SheetHeader className="p-4 pb-2 border-b border-border"> 
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto">
                  <nav className="flex flex-col space-y-1 p-4">
                    <form 
                      onSubmit={(e) => handleSearchSubmit(e, mobileSearchQuery)}
                      className="relative mb-3"
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
                      <SheetClose asChild key={item.label}>
                        <Link
                          href={item.href}
                          className={`text-base font-medium hover:text-primary transition-colors py-2.5 px-3 rounded-md hover:bg-primary/10 ${pathname === item.href ? 'text-primary bg-primary/10' : 'text-foreground'}`}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                     {!authLoading && user && (
                        <SheetClose asChild>
                           <Link
                            href="/profile"
                            className={`text-base font-medium hover:text-primary transition-colors py-2.5 px-3 rounded-md hover:bg-primary/10 flex items-center ${pathname === "/profile" ? 'text-primary bg-primary/10' : 'text-foreground'}`}
                          >
                             <UserIcon className="mr-2 h-4 w-4" /> Profile
                          </Link>
                        </SheetClose>
                     )}
                  </nav>
                </div>
                <div className="p-4 border-t border-border space-y-3">
                   {!authLoading && user ? (
                     <SheetClose asChild>
                        <Button variant="outline" onClick={handleLogout} className="w-full text-destructive border-destructive hover:bg-destructive/10">
                          <LogOut className="mr-2 h-4 w-4"/> Log Out
                        </Button>
                     </SheetClose>
                   ) : !authLoading && !user ? (
                     <>
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full text-foreground border-primary hover:bg-primary/10 hover:text-primary">
                          <Link href="/login"><LogIn className="mr-2 h-4 w-4"/>Login</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild variant="default" className="w-full btn-primary-gradient">
                          <Link href="/register"><UserPlus className="mr-2 h-4 w-4"/>Sign Up</Link>
                        </Button>
                      </SheetClose>
                     </>
                   ) : authLoading ? (
                      <div className="flex justify-center"> 
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                   ): null}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  );
}
