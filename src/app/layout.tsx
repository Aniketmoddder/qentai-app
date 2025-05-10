
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google'; // Changed from Geist
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/context/auth-context';


const inter = Inter({ // Changed from geistSans
  variable: '--font-inter', // Changed variable name
  subsets: ['latin'],
  display: 'swap', // Added for better font loading
});

const robotoMono = Roboto_Mono({ // Changed from geistMono
  variable: '--font-roboto-mono', // Changed variable name
  subsets: ['latin'],
  weight: ['400', '500', '700'], // Added common weights
  display: 'swap', // Added for better font loading
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
      <body className={`${inter.variable} ${robotoMono.variable} font-sans antialiased flex flex-col min-h-full bg-background text-foreground overflow-x-hidden`}>
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

