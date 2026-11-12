/**
 * Origen live: consulta el backend mediante el adaptador.
 *
 * - Polling HTTP con intervalo configurable (NEXT_PUBLIC_POLL_INTERVAL_MS).
 * - SSE opcional (NEXT_PUBLIC_TELEMETRY_TRANSPORT=sse) con polling de respaldo.
 * - Espera exponencial con variación tras errores consecutivos.
 * - Pausa con la pestaña oculta y reintenta al volver o al recuperar la red.
 * - Nunca hay dos solicitudes simultáneas; todo se limpia en stop().
 */
import { config } from '../config';
import { createRenderAdapter, type BackendAdapter } from './adapter';
import { toTelemetryError } from './http';
import type { SourceCallbacks, TelemetrySource } from './source';

const HISTORY_EVERY_MS = 60_000;
const CONFIG_EVERY_MS = 5 * 60_000;

export function backoffDelay(failures: number, base = config.pollIntervalMs, max = config.maxBackoffMs): number {
  const exp = Math.min(max, base * 2 ** Math.max(0, failures - 1));
  // Variación determinista suficiente para no sincronizar a todos los visitantes.
  const jitter = 0.85 + ((failures * 7919) % 30) / 100;
  return Math.round(Math.min(max, exp * jitter));
}

export function createLiveSource(adapter: BackendAdapter = createRenderAdapter()): TelemetrySource {
  let cb: SourceCallbacks | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let inFlight = false;
  let failures = 0;
  let lastHistoryAt = 0;
  let lastConfigAt = 0;
  let stream: EventSource | null = null;
  let streamHealthy = false;
  let running = false;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = (delay: number) => {
    clearTimer();
    if (!running) return;
    timer = setTimeout(poll, delay);
  };

  async function poll() {
    clearTimer();
    if (!running || inFlight) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return; // se reanuda al volver
    inFlight = true;
    controller = new AbortController();
    cb?.onLoading(true);
    const now = Date.now();
    const includeHistory = now - lastHistoryAt >= HISTORY_EVERY_MS;
    const includeConfig = now - lastConfigAt >= CONFIG_EVERY_MS;
    try {
      const frame = await adapter.fetchFrame({ signal: controller.signal, includeHistory, includeConfig });
      if (!running) return;
      failures = 0;
      if (includeHistory) lastHistoryAt = now;
      if (includeConfig) lastConfigAt = now;
      cb?.onFrame(frame);
      // Con SSE activo basta un sondeo lento para historial y configuración.
      schedule(streamHealthy ? Math.max(HISTORY_EVERY_MS / 2, config.pollIntervalMs) : config.pollIntervalMs);
    } catch (error) {
      if (!running || controller?.signal.aborted) return;
      failures += 1;
      const delay = backoffDelay(failures);
      cb?.onError(toTelemetryError(error), Date.now() + delay);
      schedule(delay);
    } finally {
      inFlight = false;
      controller = null;
      cb?.onLoading(false);
    }
  }

  function openStream() {
    if (config.transport !== 'sse' || typeof EventSource === 'undefined') return;
    const url = adapter.streamUrl();
    if (!url) return;
    stream = new EventSource(url);
    const handle = (event: MessageEvent) => {
      const frame = adapter.parseStreamMessage(String(event.data));
      if (frame) {
        streamHealthy = true;
        failures = 0;
        cb?.onFrame(frame);
      }
    };
    stream.addEventListener('status', handle as EventListener);
    stream.onmessage = handle;
    stream.onerror = () => {
      // EventSource reconecta solo; mientras tanto el polling vuelve al ritmo normal.
      streamHealthy = false;
      schedule(config.pollIntervalMs);
    };
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') schedule(0);
  };
  const onOnline = () => schedule(0);

  return {
    mode: 'live',
    start(callbacks) {
      if (running) return;
      running = true;
      cb = callbacks;
      failures = 0;
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('online', onOnline);
      openStream();
      void poll();
    },
    stop() {
      running = false;
      clearTimer();
      controller?.abort();
      stream?.close();
      stream = null;
      streamHealthy = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      cb = null;
    },
    refresh() {
      if (!running) return;
      lastHistoryAt = 0;
      schedule(0);
    },
  };
}
