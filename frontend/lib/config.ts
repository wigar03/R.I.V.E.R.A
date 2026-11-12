/**
 * Configuración pública del frontend.
 *
 * Único punto donde se leen las variables de entorno. Next.js sustituye las
 * variables NEXT_PUBLIC_* durante la compilación, por eso se acceden con su
 * nombre literal (no mediante process.env[nombre]). Cambiar un valor en Vercel
 * exige un nuevo despliegue.
 *
 * Nunca colocar secretos en variables NEXT_PUBLIC_: terminan en el navegador.
 */

export type DataMode = 'mock' | 'live';
export type Transport = 'poll' | 'sse';

function readNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  if (!raw || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeBaseUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // Sin barra final: las rutas se unen con apiUrl().
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

const rawMode = process.env.NEXT_PUBLIC_DATA_MODE?.trim().toLowerCase();
const rawTransport = process.env.NEXT_PUBLIC_TELEMETRY_TRANSPORT?.trim().toLowerCase();

export const config = {
  /** URL base del backend en Render. Obligatoria para el modo live. */
  apiBaseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  /** mock: demostración local. live: backend real. */
  dataMode: (rawMode === 'live' ? 'live' : 'mock') as DataMode,
  /** poll (HTTP periódico) o sse (Server-Sent Events con polling de respaldo). */
  transport: (rawTransport === 'sse' ? 'sse' : 'poll') as Transport,
  /** Ruta del flujo SSE, relativa a la URL base. Solo se usa con transport=sse. */
  streamPath: process.env.NEXT_PUBLIC_TELEMETRY_STREAM_PATH?.trim() || '/api/public/stream',
  /** Intervalo entre consultas HTTP. Alinear con la frecuencia de envío del MKR. */
  pollIntervalMs: readNumber(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS, 7000, 2000, 120000),
  /** Una lectura más antigua que este umbral deja de considerarse "en vivo". */
  staleAfterMs: readNumber(process.env.NEXT_PUBLIC_STALE_AFTER_MS, 30000, 5000, 600000),
  /** Tiempo máximo de cada solicitud. Render puede tardar en despertar. */
  requestTimeoutMs: readNumber(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS, 20000, 3000, 90000),
  /** Espera máxima entre reintentos tras errores consecutivos. */
  maxBackoffMs: readNumber(process.env.NEXT_PUBLIC_MAX_BACKOFF_MS, 60000, 5000, 300000),
  /** Ventana del historial para las gráficas, en minutos. */
  historyMinutes: readNumber(process.env.NEXT_PUBLIC_HISTORY_MINUTES, 60, 5, 1440),
  /** Zona horaria con la que se muestran las horas. */
  timeZone: process.env.NEXT_PUBLIC_TIMEZONE?.trim() || 'America/Managua',
} as const;

/**
 * Construye una URL del backend uniendo la base y la ruta sin barras dobles.
 * Devuelve null si no hay URL base configurada.
 */
export function apiUrl(path: string, query?: Record<string, string | number | undefined>): string | null {
  if (!config.apiBaseUrl) return null;
  const cleanPath = `/${path.replace(/^\/+/, '')}`;
  const url = new URL(`${config.apiBaseUrl}${cleanPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
