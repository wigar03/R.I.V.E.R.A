'use client';
import { ChevronDown, Sprout } from 'lucide-react';
import { plantProfiles, RETURN_ANGLE_DEG, type PlantProfile } from '../../lib/content';
import { formatDateTime, formatNumber } from '../../lib/format';
import { useTelemetry } from '../../lib/telemetry/useTelemetry';
import type { Datum, PotState } from '../../lib/telemetry/types';
import { KindChip } from '../observatory/parts';
import { RiverNode } from '../river/RiverNode';

function Value({ d, digits = 0, suffix }: { d: Datum<number> | undefined; digits?: number; suffix?: string }) {
  if (!d || d.value === null) return <span style={{ color: 'var(--muted)', fontWeight: 500 }}>No disponible</span>;
  return (
    <>
      {formatNumber(d.value, digits)}
      {suffix ?? (d.unit ? ` ${d.unit}` : '')} <KindChip kind={d.kind} simulated={d.simulated} />
    </>
  );
}

function PotCard({ profile, pot, active, showLive }: { profile: PlantProfile; pot?: PotState; active: boolean; showLive: boolean }) {
  const dose = pot?.currentDoseMl.value ?? null;
  const deficit = pot?.deficitMl.value ?? null;
  const fill = dose && deficit !== null ? Math.min(100, Math.max(0, (deficit / dose) * 100)) : null;
  return (
    <article className="card pot" data-active={active || undefined} aria-labelledby={`pot-${profile.index}`}>
      <span className="pot-anchor" data-river-branch="" aria-hidden="true" />
      <div className="pot-head">
        <span className="pot-icon" aria-hidden="true">
          <Sprout size={28} color="var(--green)" />
        </span>
        <div>
          <span className="pot-badge">MACETA {profile.index + 1} · DEMANDA {profile.demand.toUpperCase()}</span>
          <h3 id={`pot-${profile.index}`}>{profile.name}</h3>
          <i>{profile.latin}</i>
        </div>
      </div>

      <div className="pot-stats">
        <div className="pot-stat">
          <strong>{formatNumber(profile.kc, profile.kc % 1 ? 2 : 1)}</strong>
          <span>Kc inicial</span>
        </div>
        <div className="pot-stat">
          <strong>{profile.doseMl} ml</strong>
          <span>Dosis inicial</span>
        </div>
        <div className="pot-stat">
          <strong>{dose !== null ? `${formatNumber(dose, 0)} ml` : '—'}</strong>
          <span>Dosis actual</span>
        </div>
      </div>

      {showLive && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: 'var(--muted)', marginBottom: 6 }}>
            <span>Déficit estimado</span>
            <span className="mono">{deficit !== null ? `${formatNumber(deficit, 0)} ml${dose ? ` de ${formatNumber(dose, 0)}` : ''}` : 'No disponible'}</span>
          </div>
          <div className="pot-meter" role="img" aria-label={fill !== null ? `Déficit al ${Math.round(fill)} % de la dosis` : 'Déficit no disponible'}>
            <i style={{ width: `${fill ?? 0}%` }} />
          </div>
        </div>
      )}

      <p className="pot-note">{profile.note}</p>

      <details>
        <summary>
          Detalle de la maceta <ChevronDown size={18} aria-hidden />
        </summary>
        <dl className="kv">
          <div>
            <dt>Estado de riego</dt>
            <dd>{active ? 'Regando ahora' : pot?.willWater ? 'En la cola de riego' : pot ? 'En espera' : 'No disponible'}</dd>
          </div>
          <div>
            <dt>Último riego</dt>
            <dd>{pot?.lastIrrigationAt ? formatDateTime(pot.lastIrrigationAt) : 'No registrado'}</dd>
          </div>
          <div>
            <dt>Drenaje registrado</dt>
            <dd>{pot?.lastDrainAt ? formatDateTime(pot.lastDrainAt) : 'No registrado'}</dd>
          </div>
          <div>
            <dt>Ajuste por drenaje</dt>
            <dd>
              <Value d={pot?.adjustFactor} digits={2} suffix="×" />
            </dd>
          </div>
          <div>
            <dt>Pérdida estimada, día soleado</dt>
            <dd>{profile.dailyLoss}</dd>
          </div>
          <div>
            <dt>Ángulo del brazo</dt>
            <dd>
              {pot?.angleDeg.value != null ? <Value d={pot.angleDeg} /> : `${profile.angleDeg}° de partida`}
            </dd>
          </div>
          <div>
            <dt>Sensor de suelo</dt>
            <dd>{profile.index === 1 ? 'Capacitivo de referencia' : 'No tiene; se estima'}</dd>
          </div>
          {pot && (pot.label || pot.plants.length > 0) && (
            <div>
              <dt>Registrado en el robot</dt>
              <dd style={{ textAlign: 'right' }}>
                {[pot.label, pot.plants.join(', ')].filter(Boolean).join(' · ')}
                {pot.kc.value !== null && ` · Kc ${formatNumber(pot.kc.value, 2)}`}
              </dd>
            </div>
          )}
        </dl>
      </details>
    </article>
  );
}

export function PotsSection() {
  const t = useTelemetry();
  const showLive = t.pots.length > 0;
  return (
    <section className="section" id="plantas" aria-labelledby="pots-title">
      <div className="wrap">
        <RiverNode style={{ top: 6 }} />
        <header className="section-head">
          <span className="eyebrow">Tres plantas, tres perfiles</span>
          <h2 id="pots-title">Una dosis para cada especie.</h2>
          <p>
            Cada maceta tiene un coeficiente de consumo (Kc) y una dosis. Son parámetros iniciales del modelo: el robot los
            ajusta con el drenaje y se afinan en la calibración. El retorno al depósito está a {RETURN_ANGLE_DEG}°.
          </p>
        </header>
        <div className="pots">
          {plantProfiles.map((p) => (
            <PotCard
              key={p.index}
              profile={p}
              pot={t.pots.find((x) => x.index === p.index)}
              active={!!t.cycle?.active && t.cycle.potIndex === p.index}
              showLive={showLive}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
