import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

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
        {/* One Toaster for the WHOLE app, not just the signed-in shell: it used to live in
            (app)/layout, so every toast.error on /login and /signup — including "Invalid email
            or password" — was thrown away with nothing mounted to render it. */}
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
