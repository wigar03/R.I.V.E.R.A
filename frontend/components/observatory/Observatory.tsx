'use client';
import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Droplet, Droplets, FlaskConical, Gauge, Info, Radar, RefreshCw, Sun, Thermometer, Waves, Wind } from 'lucide-react';
import { config } from '../../lib/config';
import { plantProfiles } from '../../lib/content';
import { formatAge, formatNumber, formatTime } from '../../lib/format';
import { useTelemetry } from '../../lib/telemetry/useTelemetry';
import type { CycleAction, CycleStatus, HistoryPoint, TelemetryState } from '../../lib/telemetry/types';
import { RiverNode } from '../river/RiverNode';
import { MetricCard, MetricSkeleton, Sparkline, StatusPill } from './parts';

const ACTION_LABEL: Record<CycleAction, string> = {
  irrigate: 'Riego',
  prime: 'Cebado del circuito',
  demo: 'Recorrido de demostración',
  stop: 'Parada',
  unknown: 'Orden',
};
const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  pending: 'pendiente',
  accepted: 'aceptada por el robot',
  running: 'en curso',
  completed: 'completada',
  failed: 'fallida',
  cancelled: 'cancelada',
  expired: 'caducada',
  unknown: 'estado desconocido',
};

const potName = (i: number | null) => (i === null ? null : `maceta ${i + 1} (${plantProfiles[i]?.name.toLowerCase() ?? 'sin perfil'})`);

function useSecondsUntil(at: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [at]);
  return at ? Math.max(0, Math.ceil((at - now) / 1000)) : null;
}

function Notice({ t }: { t: ReturnType<typeof useTelemetry> }) {
  const retryIn = useSecondsUntil(t.nextRetryAt);
  const demoButton = t.mode === 'live' && (
    <button className="btn btn-ghost btn-small" onClick={() => t.setDemoOverride(!t.demoOverride)}>
      <FlaskConical size={16} aria-hidden /> {t.demoOverride ? 'Volver a los datos del robot' : 'Ver demostración'}
    </button>
  );
  const retryButton = (
    <button className="btn btn-ghost btn-small" onClick={t.refresh} disabled={t.loading}>
      <RefreshCw size={16} aria-hidden /> {t.loading ? 'Consultando…' : 'Reintentar ahora'}
    </button>
  );
  const actions = (...nodes: React.ReactNode[]) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{nodes}</div>;

  switch (t.status) {
    case 'demo':
      return (
        <div className="obs-notice" data-tone="demo">
          <FlaskConical size={18} aria-hidden />
          <div>
            <strong>Demostración.</strong> Los valores se generan en este navegador con un modelo determinista. No provienen del
            robot ni de sus sensores.
            {t.demoOverride && actions(demoButton)}
          </div>
        </div>
      );
    case 'connecting':
      return (
        <div className="obs-notice" data-tone="info">
          <Info size={18} aria-hidden />
          <div>Conectando con el servidor. Si estaba en reposo, puede tardar hasta un minuto en responder.</div>
        </div>
      );
    case 'stale':
      return (
        <div className="obs-notice" data-tone="warn">
          <AlertTriangle size={18} aria-hidden />
          <div>
            El servidor responde, pero la última lectura del robot es de {formatTime(t.reading?.measuredAt ?? t.reading?.receivedAt)} ({formatAge(t.ageSeconds)}).
            Los valores se muestran como referencia, no como datos en vivo.
          </div>
        </div>
      );
    case 'disconnected':
      if (t.backend === 'reachable') {
        return (
          <div className="obs-notice" data-tone="warn">
            <AlertTriangle size={18} aria-hidden />
            <div>
              El servidor responde, pero el robot todavía no ha enviado lecturas.
              {actions(demoButton)}
            </div>
          </div>
        );
      }
      return (
        <div className="obs-notice" data-tone="warn">
          <AlertTriangle size={18} aria-hidden />
          <div>
            No se pudo contactar con el servidor{t.lastError?.kind === 'timeout' ? ': no respondió a tiempo' : ' (sin red o bloqueo CORS)'}.
            {t.reading ? ` Se conserva la última lectura, de ${formatTime(t.reading.measuredAt ?? t.reading.receivedAt)}.` : ''}
            {retryIn !== null ? ` Nuevo intento en ${retryIn} s.` : ''}
            {actions(retryButton, demoButton)}
          </div>
        </div>
      );
    case 'error':
      return (
        <div className="obs-notice" data-tone="error">
          <AlertTriangle size={18} aria-hidden />
          <div>
            {t.lastError?.kind === 'config'
              ? 'Falta configurar la dirección del backend (NEXT_PUBLIC_API_URL).'
              : t.lastError?.kind === 'payload'
                ? 'El servidor respondió con datos en un formato inesperado.'
                : `El servidor respondió con un error${t.lastError?.status ? ` ${t.lastError.status}` : ''}.`}
            {retryIn !== null ? ` Nuevo intento en ${retryIn} s.` : ''}
            {actions(retryButton, demoButton)}
          </div>
        </div>
      );
    default:
      return null;
  }
}

function series(history: HistoryPoint[], key: keyof Omit<HistoryPoint, 'at'>) {
  // Máximo ~60 puntos para que la gráfica sea legible en pantallas estrechas.
  const step = Math.max(1, Math.ceil(history.length / 60));
  return history.filter((_, i) => i % step === 0 || i === history.length - 1).map((p) => p[key]);
}

function boolText(v: boolean | null, yes: string, no: string) {
  return v === null ? null : v ? yes : no;
}

function Metrics({ t }: { t: TelemetryState }) {
  const r = t.reading;
  if (!r && t.status === 'connecting') {
    return (
      <div className="metrics" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => <MetricSkeleton key={i} />)}
      </div>
    );
  }
  const old = !!r && t.status !== 'live' && t.status !== 'demo';
  const env = r?.environment;
  const h = t.history;
  return (
    <div className="metrics">
      <MetricCard
        icon={<Thermometer size={18} aria-hidden />}
        name="Temperatura"
        datum={env?.temperature ?? null}
        display={env?.temperature.value != null ? formatNumber(env.temperature.value, 1) : null}
        unitLabel="°C"
        note="Aire en la copa del árbol (MKR IoT Carrier)."
        trend={<Sparkline values={series(h, 'temperature')} label="Tendencia de la temperatura" />}
        old={old}
      />
      <MetricCard
        icon={<Wind size={18} aria-hidden />}
        name="Humedad del aire"
        datum={env?.airHumidity ?? null}
        display={env?.airHumidity.value != null ? formatNumber(env.airHumidity.value, 0) : null}
        unitLabel="% HR"
        note="Humedad relativa del ambiente."
        trend={<Sparkline values={series(h, 'airHumidity')} label="Tendencia de la humedad del aire" min={0} max={100} />}
        old={old}
      />
      <MetricCard
        icon={<Sun size={18} aria-hidden />}
        name="Luz ambiental"
        datum={env?.light ?? null}
        display={env?.light.value != null ? formatNumber(env.light.value, 0) : null}
        unitLabel="/ 100 relativa"
        note="Escala relativa del sensor de luz. No está calibrada en lux."
        trend={<Sparkline values={series(h, 'light')} label="Tendencia de la luz relativa" min={0} max={100} />}
        old={old}
      />
      <MetricCard
        icon={<Droplets size={18} aria-hidden />}
        name="Suelo · maceta 2"
        datum={r?.soil.moisture ?? null}
        display={r?.soil.moisture.value != null ? formatNumber(r.soil.moisture.value, 0) : null}
        unitLabel="% relativo"
        note="Sensor capacitivo de referencia, solo en la hierbabuena. No mide las otras dos macetas."
        trend={<Sparkline values={series(h, 'soilMoisture')} label="Tendencia de la humedad de referencia" min={0} max={100} />}
        old={old}
        featured
      />
      <MetricCard
        icon={<Waves size={18} aria-hidden />}
        name="Drenaje en el colector"
        datum={r?.drain.detected ?? null}
        display={boolText(r?.drain.detected.value ?? null, 'Agua detectada', 'Sin drenaje')}
        note={
          r?.drain.attributedPotIndex != null
            ? `Atribuido a la ${potName(r.drain.attributedPotIndex)}, la del ciclo activo.`
            : 'Sensor de agua compartido: el drenaje se atribuye a la maceta que se acaba de regar.'
        }
        old={old}
      />
      <MetricCard
        icon={<Activity size={18} aria-hidden />}
        name="Bomba"
        datum={r?.actuators.pumpOn ?? null}
        display={boolText(r?.actuators.pumpOn.value ?? null, 'Encendida', 'Apagada')}
        note="Minibomba de 5 V. El volumen se estima por tiempo de bomba y caudal calibrado."
        old={old}
      />
      <MetricCard
        icon={<Radar size={18} aria-hidden />}
        name="Distancia al visitante"
        datum={r?.actuators.distanceCm ?? null}
        display={r?.actuators.distanceCm.value != null ? formatNumber(r.actuators.distanceCm.value, 0) : null}
        unitLabel="cm"
        note={r?.actuators.distanceCm.value != null ? 'Sensor ultrasónico al frente. Bajo unos 80 cm se encienden los LEDs.' : 'El firmware todavía no transmite esta lectura.'}
        old={old}
      />
      <MetricCard
        icon={<Gauge size={18} aria-hidden />}
        name="Agua en el depósito"
        datum={r?.actuators.tankPercent ?? null}
        display={r?.actuators.tankPercent.value != null ? formatNumber(r.actuators.tankPercent.value, 0) : null}
        unitLabel="% estimado"
        note={
          r?.actuators.tankPercent.value != null
            ? 'Estimación por los mililitros bombeados; bajo el 25 % el robot pide recarga.'
            : 'El firmware todavía no transmite esta estimación.'
        }
        old={old}
      />
      <MetricCard
        icon={<Droplet size={18} aria-hidden />}
        name="Agua entregada hoy"
        datum={t.cycle?.waterTodayMl ?? null}
        display={t.cycle?.waterTodayMl.value != null ? formatNumber(t.cycle.waterTodayMl.value, 0) : null}
        unitLabel={t.cycle?.dailyCapMl.value != null ? `ml de ${formatNumber(t.cycle.dailyCapMl.value, 0)} ml máx.` : 'ml'}
        note="Suma estimada por tiempo de bomba. No hay caudalímetro."
        old={old}
      />
    </div>
  );
}

function CycleCard({ t }: { t: TelemetryState }) {
  const c = t.cycle;
  let title = 'Sin información del ciclo';
  let detail: string | null = null;
  if (c) {
    if (c.active) {
      title = `${ACTION_LABEL[c.action ?? 'unknown']}${c.status ? ` ${CYCLE_STATUS_LABEL[c.status]}` : ''}`;
      detail = potName(c.potIndex) ? `Destino: ${potName(c.potIndex)}.` : null;
    } else {
      title = c.shouldWater ? 'Riego pendiente' : 'En espera';
    }
  }
  return (
    <section className="card cycle-card" aria-labelledby="cycle-title">
      <span className="eyebrow">Ciclo de riego</span>
      <h3 id="cycle-title">{title}</h3>
      {(detail || c?.reason) && <p>{[detail, c?.reason].filter(Boolean).join(' ')}</p>}
      {c?.nextAllowedAt && <div className="cycle-row">Próximo riego permitido: {formatTime(c.nextAllowedAt)}</div>}
    </section>
  );
}

export function Observatory() {
  const t = useTelemetry();
  const at = t.reading?.measuredAt ?? t.reading?.receivedAt ?? null;
  return (
    <section className="section" id="observatorio" aria-labelledby="obs-title">
      <div className="wrap">
        <RiverNode style={{ top: 6 }} />
        <header className="section-head">
          <span className="eyebrow">Observatorio IoT</span>
          <h2 id="obs-title">Lo que el robot percibe.</h2>
          <p>Lecturas del ambiente, de la maceta de referencia y del circuito de agua, con su origen y antigüedad.</p>
        </header>

        <div className="card obs-bar">
          <div className="obs-bar-top">
            <StatusPill status={t.status} />
            <span className="mono" style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
              {t.mode === 'live' && !t.demoOverride ? 'Fuente: servidor del robot' : 'Fuente: simulación local'}
            </span>
          </div>
          <dl className="obs-meta">
            <div>
              <dt>Última lectura</dt>
              <dd className="mono" suppressHydrationWarning>{formatTime(at)}</dd>
            </div>
            <div>
              <dt>Antigüedad</dt>
              <dd className="mono">{formatAge(t.ageSeconds)}</dd>
            </div>
            <div>
              <dt>Dispositivo</dt>
              <dd className="mono">{t.device.deviceId ?? '—'}</dd>
            </div>
            <div>
              <dt>Hora local</dt>
              <dd className="mono">{config.timeZone.replace('America/', '')}</dd>
            </div>
          </dl>
          <Notice t={t} />
        </div>

        <Metrics t={t} />
        <CycleCard t={t} />

        <div className="obs-legend" aria-label="Leyenda del origen de los datos">
          <span className="chip" data-kind="measured">Medido</span> lectura de un sensor
          <span className="chip" data-kind="estimated">Estimado</span> cálculo del modelo
          <span className="chip" data-kind="configured">Configurado</span> parámetro inicial o calibrado
          <span className="chip" data-kind="simulated">Simulado</span> demostración local
        </div>
      </div>
    </section>
  );
}
