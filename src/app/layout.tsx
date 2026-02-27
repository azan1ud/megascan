import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'MegaScan - Real-time Token Intelligence for MegaETH',
  description:
    'The first dedicated token screener, analytics dashboard, and portfolio tracker for the MegaETH blockchain. Track prices, discover new tokens, and analyze trends.',
  keywords: [
    'MegaETH',
    'token screener',
    'DEX screener',
    'MegaETH price',
    'Kumbaya',
    'MegaETH tokens',
    'MegaETH DEX',
  ],
  openGraph: {
    title: 'MegaScan - Real-time Token Intelligence for MegaETH',
    description: 'Track every token on MegaETH. Real-time prices, charts, and analytics.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-mega-bg text-mega-text font-sans antialiased min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
