import type { TelemetryError, TelemetryFrame } from './types';

/** Callbacks con los que un origen de datos informa al almacén. */
export interface SourceCallbacks {
  onFrame(frame: TelemetryFrame): void;
  onLoading(loading: boolean): void;
  /** Error de transporte o de formato; nextRetryAt es el próximo intento programado. */
  onError(error: TelemetryError, nextRetryAt: number | null): void;
}

/** Interfaz común de los orígenes mock y live. */
export interface TelemetrySource {
  readonly mode: 'mock' | 'live';
  start(callbacks: SourceCallbacks): void;
  stop(): void;
  /** Fuerza un intento inmediato (por ejemplo, botón "Reintentar"). */
  refresh(): void;
}
