import type { Metadata, Viewport } from 'next';
import { Poppins, Roboto_Mono, Zen_Dots, Orbitron } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/context/auth-context';
import AuthStatusGuard from '@/components/layout/AuthStatusGuard'; // Import the guard

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

const zenDots = Zen_Dots({
  variable: '--font-zen-dots',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});


export const metadata: Metadata = {
  title: 'Qentai - Your Gateway to Anime',
  description: 'Discover, watch, and enjoy your favorite anime series and movies.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [ 
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(var(--background))' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full overflow-x-hidden ${poppins.variable} ${robotoMono.variable} ${zenDots.variable} ${orbitron.variable}`}>
      <head>
        {/* Google Fonts preconnect links are handled by next/font */}
      </head>
      <body className="font-sans antialiased flex flex-col min-h-full bg-background text-foreground overflow-x-hidden">
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={0}>
              <Header />
              <main className="flex-grow">
                <AuthStatusGuard>
                  {children}
                </AuthStatusGuard>
              </main>
              <Footer />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
