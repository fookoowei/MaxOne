import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

// One family, set like a ledger: Plex has true tabular figures, so columns of money align.
const plex = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'MaxOne Console', template: '%s · MaxOne Console' },
  description: 'Staff back-office console for MaxOne wallets, approvals and audit.',
};

export const viewport: Viewport = {
  themeColor: '#0F6E56',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plex.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        {/* App-wide, not dashboard-only: /login sits outside the (dashboard) group, so its
            toasts had nothing to render into. */}
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
