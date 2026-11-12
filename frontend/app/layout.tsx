import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono', display: 'swap' });

const description =
  'R.I.V.E.R.A., Robot Inteligente Vertical de Eco-Riego Automatizado: un huerto vertical que estima la necesidad de agua de cada planta y la riega de forma diferenciada. MideaBot 2026, categoría Robot Creativo.';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'R.I.V.E.R.A. · Eco-riego vertical automatizado',
  description,
  applicationName: 'R.I.V.E.R.A.',
  openGraph: {
    title: 'R.I.V.E.R.A. · Eco-riego vertical automatizado',
    description,
    type: 'website',
    locale: 'es_NI',
    images: [{ url: '/prototipo.png', width: 380, height: 765, alt: 'Ilustración de diseño del prototipo R.I.V.E.R.A. v3.2' }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f8f3',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
