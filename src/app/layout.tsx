import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { TooltipProvider } from "@/components/ui/tooltip";


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AniStream - Your Gateway to Anime',
  description: 'Discover, watch, and enjoy your favorite anime series and movies.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no', // For responsiveness
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}> {/* Removed flex flex-col min-h-screen from body, handled in globals.css */}
        <QueryProvider>
          <TooltipProvider delayDuration={0}> {/* Added TooltipProvider here for global access */}
            <Header />
            <main>{children}</main> {/* main will take flex-grow from globals.css */}
            <Footer />
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
