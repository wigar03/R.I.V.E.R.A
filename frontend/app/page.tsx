import { Observatory } from '../components/observatory/Observatory';
import { PotsSection } from '../components/pots/PotsSection';
import { RiverFlow } from '../components/river/RiverFlow';
import { Header, type NavLink } from '../components/site/Header';
import { Footer, Hero, HowItWorks, Sustainability, Team } from '../components/site/Sections';

const links: NavLink[] = [
  { href: '#observatorio', label: 'Observatorio' },
  { href: '#plantas', label: 'Plantas' },
  { href: '#funcionamiento', label: 'Cómo funciona' },
  { href: '#sostenibilidad', label: 'Sostenibilidad' },
  { href: '#equipo', label: 'Equipo', cta: true },
];

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#observatorio">
        Ir al observatorio
      </a>
      <Header links={links} />
      <main>
        <div className="stage">
          <RiverFlow />
          <Hero />
          <Observatory />
          <PotsSection />
          <HowItWorks />
          <Sustainability />
        </div>
        <Team />
      </main>
      <Footer />
    </>
  );
}
