/**
 * Almacén único de telemetría (patrón external store para useSyncExternalStore).
 *
 * - Una sola suscripción al origen aunque haya varios componentes montados.
 * - Recalcula cada segundo la antigüedad y el estado (en vivo → desactualizado)
 *   sin esperar una nueva respuesta.
 * - Conserva la última lectura válida durante reconexiones y errores.
 */
import { config } from '../config';
import { createLiveSource } from './live';
import { createMockSource } from './mock';
import type { TelemetrySource } from './source';
import type { ConnectionStatus, HistoryPoint, TelemetryFrame, TelemetryState } from './types';

const MAX_HISTORY = 480;

export function initialState(mode = config.dataMode): TelemetryState {
  return {
    mode,
    demoOverride: false,
    status: mode === 'mock' ? 'demo' : 'connecting',
    backend: 'unknown',
    device: { deviceId: null, lastSeenAt: null, reportedOnline: null },
    reading: null,
    cycle: null,
    pots: [],
    events: [],
    history: [],
    ageSeconds: null,
    lastSuccessAt: null,
    lastError: null,
    failures: 0,
    nextRetryAt: null,
    loading: false,
  };
}

/** Deriva el estado visible. Función pura para poder probarla. */
export function deriveStatus(s: TelemetryState, staleAfterMs = config.staleAfterMs): ConnectionStatus {
  if (s.mode === 'mock' || s.demoOverride) return 'demo';
  if (s.backend === 'unknown') return s.lastError ? (s.lastError.kind === 'http' || s.lastError.kind === 'payload' ? 'error' : 'disconnected') : 'connecting';
  if (s.backend === 'error') return 'error';
  // Sin conexión: la última lectura se conserva, pero nunca se presenta como en vivo.
  if (s.backend === 'unreachable') return 'disconnected';
  // Backend accesible: depende de la última lectura del robot.
  if (!s.reading || s.ageSeconds === null) return 'disconnected';
  return s.ageSeconds * 1000 <= staleAfterMs ? 'live' : 'stale';
}

function readingTime(frame: TelemetryFrame): string | null {
  return frame.reading?.measuredAt ?? frame.reading?.receivedAt ?? frame.device.lastSeenAt;
}

function mergeHistory(prev: HistoryPoint[], frame: TelemetryFrame): HistoryPoint[] {
  let next = frame.history ?? prev;
  const at = readingTime(frame);
  const env = frame.reading?.environment;
  if (at && env && !next.some((p) => p.at === at)) {
    next = [
      ...next,
      {
        at,
        temperature: env.temperature.value,
        airHumidity: env.airHumidity.value,
        light: env.light.value,
        soilMoisture: frame.reading!.soil.moisture.value,
      },
    ];
  }
  // La ventana se mide desde la lectura más reciente, no con el reloj del visitante,
  // que puede estar desfasado respecto al servidor.
  const newest = next.reduce((m, p) => Math.max(m, Date.parse(p.at)), 0);
  const cutoff = newest - config.historyMinutes * 60_000;
  return next.filter((p) => Date.parse(p.at) >= cutoff).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-MAX_HISTORY);
}

type Listener = () => void;

export class TelemetryStore {
  private state: TelemetryState;
  private listeners = new Set<Listener>();
  private source: TelemetrySource | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  /** Antigüedad informada por el servidor y momento local en que se recibió. */
  private ageAnchor: { seconds: number; at: number } | null = null;
  private readonly serverState: TelemetryState;

  constructor(private readonly mode = config.dataMode) {
    this.state = initialState(mode);
    this.serverState = this.state;
  }

  getSnapshot = () => this.state;
  getServerSnapshot = () => this.serverState;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  };

  /** Ver la demostración en modo live sin ocultar que no son datos del robot. */
  setDemoOverride(on: boolean) {
    if (this.mode !== 'live' || this.state.demoOverride === on) return;
    this.source?.stop();
    this.ageAnchor = null;
    this.set({ ...initialState(this.mode), demoOverride: on });
    this.source = on ? createMockSource() : createLiveSource();
    this.attach();
  }

  refresh() {
    this.source?.refresh();
  }

  private set(next: TelemetryState) {
    next.status = deriveStatus(next);
    this.state = next;
    for (const l of this.listeners) l();
  }

  private start() {
    if (this.source) return;
    this.source = this.mode === 'live' && !this.state.demoOverride ? createLiveSource() : createMockSource();
    this.attach();
    this.ticker = setInterval(() => this.tick(), 1000);
  }

  private attach() {
    const source = this.source!;
    source.start({
      onFrame: (frame) => this.onFrame(frame),
      onLoading: (loading) => {
        if (this.source === source && this.state.loading !== loading) this.set({ ...this.state, loading });
      },
      onError: (error, nextRetryAt) => {
        if (this.source !== source) return;
        const backend = error.kind === 'http' || error.kind === 'payload' ? 'error' : error.kind === 'config' ? 'error' : 'unreachable';
        this.set({
          ...this.state,
          backend: this.state.backend === 'unknown' && !this.state.reading ? (backend === 'error' ? 'error' : 'unknown') : backend,
          lastError: error,
          failures: this.state.failures + 1,
          nextRetryAt,
        });
      },
    });
  }

  private stop() {
    this.source?.stop();
    this.source = null;
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  private onFrame(frame: TelemetryFrame) {
    const now = Date.now();
    const at = readingTime(frame);
    if (frame.serverAgeSeconds !== null) this.ageAnchor = { seconds: frame.serverAgeSeconds, at: now };
    else if (at) this.ageAnchor = { seconds: Math.max(0, (now - Date.parse(at)) / 1000), at: now };
    else this.ageAnchor = null;

    this.set({
      ...this.state,
      backend: 'reachable',
      device: frame.device,
      // Si el backend no trae lectura nueva se conserva la anterior.
      reading: frame.reading ?? this.state.reading,
      cycle: frame.cycle ?? this.state.cycle,
      pots: frame.pots ?? this.state.pots,
      events: frame.events ?? this.state.events,
      history: mergeHistory(this.state.history, frame),
      ageSeconds: this.currentAge(now),
      lastSuccessAt: now,
      lastError: null,
      failures: 0,
      nextRetryAt: null,
    });
  }

  private currentAge(now = Date.now()) {
    if (!this.ageAnchor) {
      const at = this.state.reading?.measuredAt ?? this.state.reading?.receivedAt;
      return at ? Math.max(0, (now - Date.parse(at)) / 1000) : null;
    }
    return this.ageAnchor.seconds + (now - this.ageAnchor.at) / 1000;
  }

  private tick() {
    const ageSeconds = this.currentAge();
    const next = { ...this.state, ageSeconds };
    const status = deriveStatus(next);
    // Solo notifica si cambia algo visible (segundos enteros o estado).
    const prevAge = this.state.ageSeconds === null ? null : Math.floor(this.state.ageSeconds);
    const newAge = ageSeconds === null ? null : Math.floor(ageSeconds);
    if (status !== this.state.status || prevAge !== newAge) this.set(next);
  }
}

let singleton: TelemetryStore | null = null;
export function getTelemetryStore(): TelemetryStore {
  if (!singleton) singleton = new TelemetryStore();
  return singleton;
}
