import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seeya - Plan Trips Together',
  description:
    'The collaborative trip planning app for friends and family. Create itineraries, share plans, and make memories together.',
  keywords: ['travel', 'trip planning', 'itinerary', 'travel app', 'group travel'],
  authors: [{ name: 'Seeya' }],
  openGraph: {
    title: 'Seeya - Plan Trips Together',
    description:
      'The collaborative trip planning app for friends and family.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Seeya',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seeya - Plan Trips Together',
    description:
      'The collaborative trip planning app for friends and family.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#804db3',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
