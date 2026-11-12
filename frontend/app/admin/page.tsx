import type { Metadata } from 'next';
import { Lab } from '../../components/lab/Lab';
import { Header } from '../../components/site/Header';
import { Footer } from '../../components/site/Sections';

export const metadata: Metadata = {
  title: 'Laboratorio virtual · R.I.V.E.R.A.',
  description: 'Simulación local de las secuencias de riego. No controla el robot.',
  robots: { index: false, follow: false },
};

export default function Admin() {
  return (
    <>
      <Header links={[{ href: '/', label: 'Volver al proyecto', cta: true }]} />
      <main>
        <Lab />
      </main>
      <Footer />
    </>
  );
}
