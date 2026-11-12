import { config } from './config';

const numberFormats = new Map<number, Intl.NumberFormat>();
export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  let f = numberFormats.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    numberFormats.set(digits, f);
  }
  return f.format(value);
}

const timeFormat = new Intl.DateTimeFormat('es-NI', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: config.timeZone,
});
const dateTimeFormat = new Intl.DateTimeFormat('es-NI', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: config.timeZone,
});

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '—' : timeFormat.format(t);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '—' : dateTimeFormat.format(t);
}

export function formatAge(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return 'sin lecturas';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 5) return 'ahora';
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
