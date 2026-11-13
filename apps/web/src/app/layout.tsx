import type { Metadata } from 'next';
import { IBM_Plex_Mono, Source_Sans_3, Syne } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
});

export const metadata: Metadata = {
  title: 'AutoBI — Governed AI dashboards from your databases',
  description:
    'Connect Postgres, MySQL, MariaDB, or SQL Server. Approve AI-proposed semantics. Run safe SQL. Ship versioned ECharts dashboards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sourceSans.variable} ${syne.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
