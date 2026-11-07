import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'R.I.V.E.R.A. — Tecnología que cuida la vida', description: 'Conoce el robot de eco-riego vertical R.I.V.E.R.A. v3.2. Un proyecto de robótica, agua y naturaleza.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
