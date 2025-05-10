
import type { Metadata } from 'next';
import { Roboto_Mono } from 'next/font/google'; // Zen_Dots import removed
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/context/auth-context';

// Zen_Dots constant definition using next/font removed

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Qentai - Your Gateway to Anime',
  description: 'Discover, watch, and enjoy your favorite anime series and movies.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no', // For responsiveness
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Zen+Dots&display=swap" rel="stylesheet" />
      </head>
      {/* Removed zenDots.variable from body className, ensure font-sans in tailwind.config.ts uses "Zen Dots" directly */}
      <body className={`${robotoMono.variable} font-sans antialiased flex flex-col min-h-full bg-background text-foreground overflow-x-hidden`}>
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={0}>
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
