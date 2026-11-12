import type { ReactNode } from 'react';
import type { ConnectionStatus, Datum, DatumKind } from '../../lib/telemetry/types';

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando',
  live: 'En vivo',
  stale: 'Datos desactualizados',
  disconnected: 'Desconectado',
  error: 'Error de conexión',
  demo: 'Demostración',
};

export function StatusPill({ status }: { status: ConnectionStatus }) {
  return (
    <span className="status-pill" data-status={status} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const KIND_LABEL: Record<DatumKind, string> = { measured: 'Medido', estimated: 'Estimado', configured: 'Configurado' };

export function KindChip({ kind, simulated }: { kind: DatumKind; simulated?: boolean }) {
  const label = simulated ? `Simulado · ${KIND_LABEL[kind].toLowerCase()}` : KIND_LABEL[kind];
  return (
    <span className="chip" data-kind={simulated ? 'simulated' : kind} title={simulated ? 'Valor de la demostración local, no del robot' : undefined}>
      {label}
    </span>
  );
}

/** Gráfica de tendencia a partir de datos reales del proveedor. Sin datos, no inventa una línea. */
export function Sparkline({ values, label, min, max }: { values: (number | null)[]; label: string; min?: number; max?: number }) {
  const points = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (points.length < 2) return <div className="spark-empty">Sin historial suficiente para la tendencia</div>;
  const W = 300;
  const H = 44;
  const lo = min ?? Math.min(...points.map((p) => p.v));
  const hi = max ?? Math.max(...points.map((p) => p.v));
  const span = hi - lo || 1;
  const n = values.length - 1 || 1;
  const coords = points.map((p) => [(p.i / n) * W, H - 4 - ((p.v - lo) / span) * (H - 8)] as const);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)} ${H} L${coords[0][0].toFixed(1)} ${H} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <path d={area} fill="currentColor" opacity="0.1" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MetricCard({
  icon,
  name,
  datum,
  display,
  unitLabel,
  note,
  trend,
  old,
  featured,
}: {
  icon: ReactNode;
  name: string;
  datum: Datum<unknown> | null;
  /** Texto del valor ya formateado; null si no hay dato. */
  display: string | null;
  unitLabel?: string | null;
  note: string;
  trend?: ReactNode;
  old?: boolean;
  featured?: boolean;
}) {
  return (
    <article className="card metric" data-featured={featured || undefined}>
      <div className="metric-head">
        <span className="metric-name">
          {icon}
          {name}
        </span>
        {datum && <KindChip kind={datum.kind} simulated={datum.simulated} />}
      </div>
      <div className={old ? 'metric-value metric-old' : 'metric-value'}>
        {display === null ? (
          <strong className="na">No disponible</strong>
        ) : (
          <>
            <strong>{display}</strong>
            {unitLabel && <span>{unitLabel}</span>}
          </>
        )}
      </div>
      {trend}
      <p className="metric-note">{note}</p>
    </article>
  );
}

export function MetricSkeleton() {
  return (
    <div className="card metric" aria-hidden="true">
      <div className="skeleton" style={{ height: 18, width: '60%' }} />
      <div className="skeleton" style={{ height: 36, width: '40%' }} />
      <div className="skeleton" style={{ height: 44 }} />
    </div>
  );
}
