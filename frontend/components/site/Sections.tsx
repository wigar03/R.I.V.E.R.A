import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Brain, ChevronDown, Cpu, FileText, Recycle, Waves } from 'lucide-react';
import { documents, flowSteps, robotComponents, sustainability, team, type ComponentGroup } from '../../lib/content';
import { RiverNode } from '../river/RiverNode';

export function Hero() {
  return (
    <section className="hero" id="inicio" aria-labelledby="hero-title">
      <div className="wrap">
        <RiverNode style={{ top: 10 }} />
        <div className="hero-grid">
          <div>
            <span className="eyebrow">MideaBot 2026 · Robot Creativo</span>
            <h1 id="hero-title" style={{ marginTop: 14 }} aria-label="R.I.V.E.R.A.">
              <span className="hero-name" aria-hidden="true">
                {'RIVERA'.split('').map((l, i) => (
                  <span key={i}>
                    {l}
                    <span className="hero-dot">.</span>
                  </span>
                ))}
              </span>
            </h1>
            <p className="hero-sub">Robot Inteligente Vertical de Eco-Riego Automatizado.</p>
            <p className="hero-lead">
              Un huerto vertical que estima cuánta agua pierde cada planta y le entrega solo su dosis, una maceta a la vez. El
              agua que sobra vuelve a la laguna de la base.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#observatorio">
                Ver la telemetría <ArrowDown size={18} aria-hidden />
              </a>
              <a className="btn btn-ghost" href="#funcionamiento">
                Cómo funciona
              </a>
            </div>
            <div className="hero-facts">
              <div>
                <strong>3</strong>
                <span>macetas con perfil propio</span>
              </div>
              <div>
                <strong>1</strong>
                <span>maceta regada a la vez</span>
              </div>
              <div>
                <strong>57,1 %</strong>
                <span>tipos de piezas reutilizadas</span>
              </div>
            </div>
          </div>
          <figure className="hero-figure">
            <div className="hero-frame">
              <Image
                src="/prototipo.png"
                alt="Ilustración del prototipo: tubo-árbol con la copa sensorial, cubeta dosificadora, brazo distribuidor, tres macetas escalonadas y la caja con el depósito."
                width={380}
                height={765}
                priority
                sizes="(min-width: 900px) 40vw, 90vw"
              />
            </div>
            <figcaption>Ilustración de diseño de la versión 3.2, con proporciones a escala. No es una fotografía.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

const GROUPS: { id: ComponentGroup; title: string; icon: React.ReactNode }[] = [
  { id: 'cerebro', title: 'El cerebro, en la copa', icon: <Brain size={18} aria-hidden /> },
  { id: 'medula', title: 'La médula, en la base', icon: <Cpu size={18} aria-hidden /> },
  { id: 'agua', title: 'El circuito del agua', icon: <Waves size={18} aria-hidden /> },
];

export function HowItWorks() {
  return (
    <section className="section" id="funcionamiento" aria-labelledby="how-title">
      <div className="wrap">
        <RiverNode style={{ top: 6 }} />
        <header className="section-head">
          <span className="eyebrow">Cómo funciona</span>
          <h2 id="how-title">Siete pasos, del aire a la raíz.</h2>
          <p>
            La necesidad de riego se calcula con variables ambientales y un perfil por especie. Son cálculos y reglas de control,
            no un modelo de aprendizaje automático.
          </p>
        </header>
        <ol className="flow">
          {flowSteps.map((step, i) => (
            <li key={step.id} className="card flow-step">
              <RiverNode />
              <span className="flow-num">PASO {String(i + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.plain}</p>
              <details>
                <summary>
                  Detalle técnico <ChevronDown size={16} aria-hidden />
                </summary>
                <p>{step.technical}</p>
              </details>
            </li>
          ))}
        </ol>

        <div className="parts" id="componentes">
          <h3>Las piezas que lo hacen posible</h3>
          <p>Dos placas se reparten el trabajo y se comunican por I2C con un cable que sube por dentro del tubo-árbol.</p>
          <div className="parts-groups">
            {GROUPS.map((g) => (
              <div className="card parts-group" key={g.id}>
                <h4>
                  {g.icon} {g.title}
                </h4>
                <ul>
                  {robotComponents
                    .filter((c) => c.group === g.id)
                    .map((c) => (
                      <li key={c.name}>
                        <strong>
                          {c.name}
                          {c.reused && <span className="tag-reused">Reutilizado</span>}
                        </strong>
                        <span>{c.role}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Sustainability() {
  return (
    <section className="section" id="sostenibilidad" aria-labelledby="eco-title">
      <div className="wrap">
        <RiverNode style={{ top: 6 }} />
        <header className="section-head">
          <span className="eyebrow">Sostenibilidad</span>
          <h2 id="eco-title">Materiales con otra oportunidad.</h2>
        </header>
        <div className="eco-grid">
          <div className="card eco-card">
            <div className="eco-big">
              {sustainability.percent} %<small>reciclado o reutilizado</small>
            </div>
            <div className="dots" role="img" aria-label={`${sustainability.reusedTypes} de ${sustainability.totalTypes} tipos de elementos`}>
              {Array.from({ length: sustainability.totalTypes }, (_, i) => (
                <i key={i} data-on={i < sustainability.reusedTypes} />
              ))}
            </div>
            <p>
              <strong>
                {sustainability.reusedTypes} de los {sustainability.totalTypes} tipos de elementos
              </strong>{' '}
              registrados son reciclados o reutilizados: cartón, botellas PET, envases, una lata, mangueras de nebulización y la
              bomba de un dispensador en desuso.
            </p>
            <p className="fine">
              El porcentaje cuenta tipos de elementos identificables, cada uno una sola vez. No corresponde al peso del robot. Los
              componentes electrónicos se declaran como nuevos.
            </p>
          </div>
          <div className="card eco-card">
            <h3 style={{ fontSize: 'var(--step-1)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Recycle size={20} aria-hidden color="var(--green)" /> Un circuito cerrado
            </h3>
            <p style={{ marginTop: 10 }}>
              Cada botella drena por un orificio en su tapa hacia un colector común, nunca sobre la maceta de abajo. Del colector, el
              agua vuelve al depósito. El embudo de retorno también devuelve el agua del cebado y la calibración.
            </p>
            <p className="fine">
              El proyecto no declara un porcentaje de ahorro de agua: todavía no se ha medido. La capacidad útil del depósito, unos
              0,6 L, es una estimación pendiente de confirmar.
            </p>
          </div>
        </div>
        <div className="lagoon" data-river-end="" aria-hidden="true">
          <svg viewBox="0 0 400 140" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lagoonFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#36c2bb" stopOpacity=".55" />
                <stop offset="1" stopColor="#0b7490" stopOpacity=".35" />
              </linearGradient>
            </defs>
            <path d="M0 40 Q 200 0 400 40 L400 140 L0 140 Z" fill="#e2f3f6" />
            <g className="lagoon-water">
              <path d="M0 62 C 60 50, 120 74, 200 62 S 340 50, 400 62 L400 140 L0 140 Z" fill="url(#lagoonFill)" />
              <path d="M0 76 C 70 66, 140 88, 210 76 S 340 66, 400 78" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
            </g>
          </svg>
        </div>
        <p className="lagoon-caption" style={{ position: 'static', marginTop: 8 }}>
          La laguna: el depósito de la base, de donde sale y adonde vuelve el agua.
        </p>
      </div>
    </section>
  );
}

export function Team() {
  return (
    <section className="section" id="equipo" aria-labelledby="team-title" style={{ paddingTop: 24 }}>
      <div className="wrap">
        <header className="section-head">
          <span className="eyebrow">Equipo</span>
          <h2 id="team-title" style={{ fontSize: 'var(--step-2)' }}>
            Quiénes lo construyen.
          </h2>
        </header>
        <div className="team-grid">
          <div className="card team-card">
            <h3>{team.institution}</h3>
            <p className="team-meta">
              {team.program}. {team.event}, categoría {team.category}. {team.venue}.
            </p>
            <ul>
              {team.members.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="team-meta" style={{ marginTop: 12 }}>
              Docente asesor: {team.advisor}
            </p>
          </div>
          <div className="card team-card">
            <h3>Documentación</h3>
            <p className="team-meta">Las láminas muestran la forma final y el funcionamiento del prototipo v3.2.</p>
            {documents.map((d) => (
              <a key={d.href} className="doc-link" href={d.href} target="_blank" rel="noopener">
                <FileText size={26} aria-hidden color="var(--water)" />
                <span style={{ flex: 1 }}>
                  <strong>{d.title}</strong>
                  <span>
                    {d.description} {d.size}
                  </span>
                </span>
                <ArrowUpRight size={18} aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <strong>R.I.V.E.R.A. · la garza de la rivera</strong>
        <span>Robot Inteligente Vertical de Eco-Riego Automatizado · Prototipo v3.2 · {team.institution}</span>
      </div>
    </footer>
  );
}
