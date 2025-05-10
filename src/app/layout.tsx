
import type { Metadata } from 'next';
import { Montserrat, Roboto_Mono } from 'next/font/google'; // Changed Inter to Montserrat
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/context/auth-context';


const montserrat = Montserrat({ // Changed from inter
  variable: '--font-montserrat', // Changed variable name
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'], // Added more weights for premium feel
  display: 'swap',
});

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
      <body className={`${montserrat.variable} ${robotoMono.variable} font-sans antialiased flex flex-col min-h-full bg-background text-foreground overflow-x-hidden`}>
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
