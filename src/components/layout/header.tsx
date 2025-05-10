
'use client';

import Link from 'next/link';
import { Search, UserCircle, Menu, LogOut, LogIn, UserPlus, User as UserIcon, Settings, LayoutGrid } from 'lucide-react';
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
import { Loader2 } from 'lucide-react';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false); // For mobile search
  
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    const headerElement = document.querySelector('header');
    if (headerElement) {
      document.documentElement.style.setProperty('--header-height', `${headerElement.offsetHeight}px`);
    }
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (isMobileMenuOpen || isSearchDrawerOpen) {
      // Close menus when path changes
      setIsMobileMenuOpen(false);
      setIsSearchDrawerOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Simplified nav items based on screenshot's footer implied structure
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/browse?sort=top', label: 'Top Anime' },
    { href: '/browse?type=movie', label: 'Movies' },
    { href: '/browse?type=tv', label: 'TV Series' },
  ];

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>, query: string, isMobileSearch: boolean = false) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      if (isMobileSearch) {
        setMobileSearchQuery('');
        setIsSearchDrawerOpen(false); // Close mobile search drawer
      } else {
        setSearchQuery(''); 
      }
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
      className={`sticky top-0 z-50 transition-all duration-200 ease-in-out ${
        isScrolled ? 'bg-background/90 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <Container className="flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <Logo iconSize={20} /> {/* Changed iconSize from 16 to 20 for a larger logo */}
          <nav className="hidden lg:flex items-center space-x-5">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`text-sm font-medium hover:text-primary transition-colors ${pathname === item.href || (item.href.includes('?') && pathname + location.search === item.href) ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Desktop Search Form */}
          <form
            onSubmit={(e) => handleSearchSubmit(e, searchQuery)}
            className="relative hidden md:block"
          >
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs w-36 lg:w-48 bg-card/70 border-transparent focus:border-primary focus:ring-primary rounded-full h-8"
              aria-label="Search Qentai"
            />
            <button type="submit" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-primary">
              <Search className="h-full w-full" />
              <span className="sr-only">Submit search</span>
            </button>
          </form>

          {/* Mobile Search Trigger */}
          <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-primary" onClick={() => setIsSearchDrawerOpen(true)}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Open search</span>
          </Button>

          {!authLoading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>{getAvatarFallback(user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover border-border shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{user.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer text-foreground hover:bg-primary/10">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {user.email === 'ninjax.desi@gmail.com' && (
                   <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center cursor-pointer text-foreground hover:bg-primary/10">
                        <LayoutGrid className="mr-2 h-4 w-4" /> Admin Panel
                    </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-border"/> 
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/20 focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !authLoading && !user ? (
             <div className="hidden md:flex items-center space-x-2">
                <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary px-3 h-8 text-sm">
                    <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="btn-primary-gradient rounded-full px-4 h-8 text-sm">
                    <Link href="/register">Sign Up</Link>
                </Button>
            </div>
          ) : authLoading ? (
             <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ): null }

          {/* Mobile Main Menu Trigger */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card p-0 flex flex-col w-[80vw] max-w-xs sm:max-w-sm border-l-border">
                <SheetHeader className="p-4 pb-2 border-b border-border"> 
                  <SheetTitle>
                    <Logo iconSize={14} />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto">
                  <nav className="flex flex-col space-y-1 p-3">
                    {navItems.map((item) => (
                      <SheetClose asChild key={item.label}>
                        <Link
                          href={item.href}
                          className={`text-base font-medium hover:text-primary transition-colors py-2.5 px-3 rounded-md hover:bg-primary/10 ${pathname === item.href || (item.href.includes('?') && pathname + location.search === item.href) ? 'text-primary bg-primary/15' : 'text-foreground'}`}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                     {!authLoading && user && (
                        <SheetClose asChild>
                           <Link
                            href="/profile"
                            className={`text-base font-medium hover:text-primary transition-colors py-2.5 px-3 rounded-md hover:bg-primary/10 flex items-center ${pathname === "/profile" ? 'text-primary bg-primary/15' : 'text-foreground'}`}
                          >
                             <UserIcon className="mr-2 h-4 w-4" /> Profile
                          </Link>
                        </SheetClose>
                     )}
                     {user?.email === 'ninjax.desi@gmail.com' && (
                        <SheetClose asChild>
                           <Link
                            href="/admin"
                            className={`text-base font-medium hover:text-primary transition-colors py-2.5 px-3 rounded-md hover:bg-primary/10 flex items-center ${pathname === "/admin" ? 'text-primary bg-primary/15' : 'text-foreground'}`}
                          >
                             <LayoutGrid className="mr-2 h-4 w-4" /> Admin Panel
                          </Link>
                        </SheetClose>
                     )}
                  </nav>
                </div>
                <div className="p-3 border-t border-border space-y-2.5">
                   {!authLoading && user ? (
                     <SheetClose asChild>
                        <Button variant="outline" onClick={handleLogout} className="w-full text-destructive border-destructive/70 hover:bg-destructive/10">
                          <LogOut className="mr-2 h-4 w-4"/> Log Out
                        </Button>
                     </SheetClose>
                   ) : !authLoading && !user ? (
                     <>
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full text-foreground border-primary/70 hover:bg-primary/10 hover:text-primary">
                          <Link href="/login"><LogIn className="mr-2 h-4 w-4"/>Login</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild variant="default" className="w-full btn-primary-gradient rounded-md">
                          <Link href="/register"><UserPlus className="mr-2 h-4 w-4"/>Sign Up</Link>
                        </Button>
                      </SheetClose>
                     </>
                   ) : authLoading ? (
                      <div className="flex justify-center py-2"> 
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                   ): null}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>

      {/* Mobile Search Drawer */}
      <Sheet open={isSearchDrawerOpen} onOpenChange={setIsSearchDrawerOpen}>
        <SheetContent side="top" className="p-0 bg-background border-b-border">
          <Container className="py-4">
            <form onSubmit={(e) => handleSearchSubmit(e, mobileSearchQuery, true)} className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input
                type="search"
                placeholder="Search Qentai..."
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                className="flex-grow bg-transparent border-0 focus:ring-0 text-lg h-auto py-2 placeholder:text-muted-foreground"
                autoFocus
                aria-label="Search Qentai mobile"
              />
              <Button type="submit" variant="ghost" size="sm" className="text-primary">Search</Button>
            </form>
          </Container>
        </SheetContent>
      </Sheet>
    </header>
  );
}

