import type { TelemetryError, TelemetryErrorKind } from './types';

export class TelemetryRequestError extends Error {
  readonly kind: TelemetryErrorKind;
  readonly status?: number;

  constructor(kind: TelemetryErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'TelemetryRequestError';
    this.kind = kind;
    this.status = status;
  }

  toTelemetryError(): TelemetryError {
    return { kind: this.kind, message: this.message, status: this.status, at: new Date().toISOString() };
  }
}

export function toTelemetryError(error: unknown): TelemetryError {
  if (error instanceof TelemetryRequestError) return error.toTelemetryError();
  return {
    kind: 'network',
    message: error instanceof Error ? error.message : 'Error desconocido',
    at: new Date().toISOString(),
  };
}

/**
 * GET JSON con tiempo máximo y cancelación externa.
 * Clasifica el fallo: timeout, red (incluye CORS, que el navegador no distingue), HTTP o payload.
 */
export async function getJson(url: string, options: { signal: AbortSignal; timeoutMs: number }): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);
  const forwardAbort = () => controller.abort();
  options.signal.addEventListener('abort', forwardAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
      // Sin cookies ni credenciales: los endpoints públicos no las necesitan.
      credentials: 'omit',
    });
    if (!response.ok) {
      throw new TelemetryRequestError('http', `El backend respondió ${response.status}`, response.status);
    }
    try {
      return await response.json();
    } catch {
      throw new TelemetryRequestError('payload', 'La respuesta del backend no es JSON válido');
    }
  } catch (error) {
    if (error instanceof TelemetryRequestError) throw error;
    if (timedOut) {
      throw new TelemetryRequestError('timeout', 'El backend no respondió a tiempo');
    }
    if (options.signal.aborted) throw error;
    throw new TelemetryRequestError('network', 'No se pudo contactar con el backend (red o CORS)');
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener('abort', forwardAbort);
  }
}
