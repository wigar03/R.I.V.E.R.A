/**
 * Adaptador del backend de R.I.V.E.R.A. (FastAPI en Render).
 *
 * ÚNICO archivo que conoce rutas y formatos del backend. Si el backend cambia
 * un nombre de campo o una ruta, se ajusta aquí; los componentes no cambian.
 *
 * Rutas públicas verificadas en https://rivera-backend.onrender.com/openapi.json
 * (API 0.2.0, 12-nov-2026):
 *   GET /api/public/status      → última lectura y estado del robot
 *   GET /api/public/readings    → historial (minutes, limit), más antiguo primero
 *   GET /api/public/pots        → configuración de macetas
 *   GET /api/public/irrigation  → decisión de riego y dosis por maceta
 * Ver docs/CONTRATO_API.md.
 */
import { apiUrl, config } from '../config';
import { getJson, TelemetryRequestError } from './http';
import type {
  CycleAction,
  CycleStatus,
  Datum,
  DatumKind,
  HistoryPoint,
  IrrigationCycle,
  PotState,
  TelemetryFrame,
  TelemetryReading,
} from './types';

export const SOIL_REFERENCE_POT_INDEX = 1; // maceta 2

export const ENDPOINTS = {
  status: '/api/public/status',
  readings: '/api/public/readings',
  pots: '/api/public/pots',
  irrigation: '/api/public/irrigation',
} as const;

// ───────────────────────── utilidades de validación ─────────────────────────

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const iso = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  // FastAPI puede omitir la zona si el datetime es "naive"; se interpreta como UTC.
  const withZone = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`;
  return Number.isNaN(Date.parse(withZone)) ? null : new Date(withZone).toISOString();
};
const inRange = (v: number | null, min: number, max: number) => (v !== null && v >= min && v <= max ? v : null);

export function datum<T>(value: T | null, unit: string | null, kind: DatumKind, simulated = false): Datum<T> {
  return { value, unit, kind, simulated };
}

// ───────────────────────── mapeo de cada recurso ─────────────────────────

export function mapReading(raw: unknown): TelemetryReading | null {
  if (!isObject(raw)) return null;
  const measuredAt = iso(raw.measured_at);
  const receivedAt = iso(raw.received_at);
  return {
    id: raw.id === undefined || raw.id === null ? null : String(raw.id),
    measuredAt,
    receivedAt,
    environment: {
      temperature: datum(inRange(num(raw.temperature), -20, 80), '°C', 'measured'),
      airHumidity: datum(inRange(num(raw.air_humidity), 0, 100), '%', 'measured'),
      light: datum(inRange(num(raw.light), 0, 100), 'relativa', 'measured'),
      pressure: datum(inRange(num(raw.pressure), 50, 120), 'kPa', 'measured'),
    },
    soil: {
      potIndex: SOIL_REFERENCE_POT_INDEX,
      moisture: datum(inRange(num(raw.soil_moisture), 0, 100), '% rel.', 'measured'),
      raw: datum(inRange(num(raw.soil_raw), 0, 4095), 'ADC', 'measured'),
    },
    drain: {
      detected: datum(bool(raw.drain_detected), null, 'measured'),
      attributedPotIndex: null,
    },
    actuators: {
      pumpOn: datum(bool(raw.pump_on), null, 'measured'),
      // Campos opcionales propuestos en el contrato; hoy el backend no los envía.
      distanceCm: datum(inRange(num(raw.distance_cm), 0, 500), 'cm', 'measured'),
      tankPercent: datum(inRange(num(raw.tank_percent), 0, 100), '%', 'estimated'),
    },
  };
}

function mapHistory(raw: unknown): HistoryPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: HistoryPoint[] = [];
  for (const item of raw) {
    if (!isObject(item)) continue;
    const at = iso(item.measured_at) ?? iso(item.received_at);
    if (!at) continue;
    points.push({
      at,
      temperature: inRange(num(item.temperature), -20, 80),
      airHumidity: inRange(num(item.air_humidity), 0, 100),
      light: inRange(num(item.light), 0, 100),
      soilMoisture: inRange(num(item.soil_moisture), 0, 100),
    });
  }
  return points.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

const ACTIONS: CycleAction[] = ['irrigate', 'prime', 'demo', 'stop'];
const STATUSES: CycleStatus[] = ['pending', 'accepted', 'running', 'completed', 'failed', 'cancelled', 'expired'];

function mapCycle(statusRaw: Json, irrigationRaw: unknown): IrrigationCycle {
  const command = isObject(statusRaw.active_command) ? statusRaw.active_command : null;
  const action = str(command?.action);
  const status = str(command?.status);
  const irrigation = isObject(irrigationRaw) ? irrigationRaw : null;
  return {
    active: command !== null,
    action: action ? (ACTIONS.includes(action as CycleAction) ? (action as CycleAction) : 'unknown') : null,
    status: status ? (STATUSES.includes(status as CycleStatus) ? (status as CycleStatus) : 'unknown') : null,
    potIndex: num(command?.pot_id),
    shouldWater: bool(irrigation?.should_water),
    reason: str(irrigation?.reason),
    waterTodayMl: datum(num(irrigation?.water_today_ml), 'ml', 'estimated'),
    dailyCapMl: datum(num(irrigation?.daily_cap_ml), 'ml', 'configured'),
    nextAllowedAt: iso(irrigation?.next_allowed_at),
  };
}

function mapPots(potsRaw: unknown, irrigationRaw: unknown): PotState[] | null {
  const config = Array.isArray(potsRaw) ? potsRaw.filter(isObject) : [];
  const plan = isObject(irrigationRaw) && Array.isArray(irrigationRaw.pots) ? irrigationRaw.pots.filter(isObject) : [];
  if (!config.length && !plan.length) return null;
  const ids = new Set<number>();
  for (const p of config) if (num(p.id) !== null) ids.add(num(p.id)!);
  for (const p of plan) if (num(p.pot_id) !== null) ids.add(num(p.pot_id)!);
  return [...ids]
    .filter((id) => id >= 0 && id <= 2)
    .sort((a, b) => a - b)
    .map((index) => {
      const c = config.find((p) => num(p.id) === index);
      const d = plan.find((p) => num(p.pot_id) === index);
      return {
        index,
        label: str(c?.name) ?? str(d?.name),
        plants: Array.isArray(c?.plants) ? (c!.plants as unknown[]).map(str).filter((s): s is string => !!s) : [],
        kc: datum(num(c?.kc) ?? num(d?.kc), null, 'configured'),
        currentDoseMl: datum(num(d?.needed_ml), 'ml', 'estimated'),
        deficitMl: datum(num(d?.carry_ml), 'ml', 'estimated'),
        adjustFactor: datum(num(d?.adjust), null, 'estimated'),
        willWater: bool(d?.will_water),
        hasSensor: bool(c?.has_sensor),
        angleDeg: datum(num(c?.angle), '°', 'configured'),
        lastIrrigationAt: iso(d?.last_irrigation_at),
        lastDrainAt: iso(d?.last_drain_at),
      };
    });
}

// ───────────────────────── interfaz del adaptador ─────────────────────────

export interface FetchContext {
  signal: AbortSignal;
  includeHistory: boolean;
  includeConfig: boolean;
}

export interface BackendAdapter {
  /** Obtiene una actualización completa. Lanza TelemetryRequestError si falla lo esencial. */
  fetchFrame(ctx: FetchContext): Promise<TelemetryFrame>;
  /** URL del flujo SSE, si el transporte lo usa. */
  streamUrl(): string | null;
  /** Convierte un mensaje SSE en una actualización parcial. */
  parseStreamMessage(data: string): TelemetryFrame | null;
}

function requireUrl(url: string | null): string {
  if (!url) throw new TelemetryRequestError('config', 'NEXT_PUBLIC_API_URL no está configurada');
  return url;
}

export function frameFromStatus(statusRaw: unknown, extra: { irrigation?: unknown; pots?: unknown; history?: unknown }): TelemetryFrame {
  if (!isObject(statusRaw) || typeof statusRaw.online !== 'boolean') {
    throw new TelemetryRequestError('payload', 'El estado del backend no tiene el formato acordado');
  }
  const reading = mapReading(statusRaw.latest);
  return {
    device: {
      deviceId: reading ? str((statusRaw.latest as Json).device_id) : null,
      lastSeenAt: iso(statusRaw.last_seen),
      reportedOnline: bool(statusRaw.online),
    },
    reading,
    serverAgeSeconds: num(statusRaw.seconds_since),
    cycle: mapCycle(statusRaw, extra.irrigation),
    pots: mapPots(extra.pots, extra.irrigation),
    events: null,
    history: extra.history === undefined ? null : mapHistory(extra.history),
  };
}

export function createRenderAdapter(): BackendAdapter {
  let potsConfig: unknown;
  let lastIrrigation: unknown;
  const opts = (signal: AbortSignal) => ({ signal, timeoutMs: config.requestTimeoutMs });
  const optional = async (url: string | null, signal: AbortSignal) => {
    try {
      return await getJson(requireUrl(url), opts(signal));
    } catch (error) {
      if (signal.aborted) throw error;
      return undefined; // dato complementario: su fallo no invalida la actualización
    }
  };

  return {
    async fetchFrame({ signal, includeHistory, includeConfig }) {
      const statusUrl = requireUrl(apiUrl(ENDPOINTS.status));
      const [status, irrigation, history, pots] = await Promise.all([
        getJson(statusUrl, opts(signal)),
        optional(apiUrl(ENDPOINTS.irrigation), signal),
        includeHistory
          ? optional(apiUrl(ENDPOINTS.readings, { minutes: config.historyMinutes, limit: 360 }), signal)
          : Promise.resolve(undefined),
        includeConfig || potsConfig === undefined ? optional(apiUrl(ENDPOINTS.pots), signal) : Promise.resolve(potsConfig),
      ]);
      if (pots !== undefined) potsConfig = pots;
      if (irrigation !== undefined) lastIrrigation = irrigation;
      return frameFromStatus(status, { irrigation: lastIrrigation, pots: potsConfig, history });
    },
    streamUrl() {
      return apiUrl(config.streamPath);
    },
    parseStreamMessage(data) {
      // Contrato propuesto: cada evento SSE "status" contiene el mismo JSON que GET /api/public/status.
      try {
        return frameFromStatus(JSON.parse(data), { irrigation: lastIrrigation, pots: potsConfig });
      } catch {
        return null;
      }
    },
  };
}
