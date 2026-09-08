import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

// Manrope: warmer and rounder than the console's Plex, so the two products read as different tools.
const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'MaxOne', template: '%s · MaxOne' },
  description: 'Your MaxOne wallet.',
  applicationName: 'MaxOne',
  appleWebApp: { capable: true, title: 'MaxOne', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#5B45B5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} antialiased`} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
