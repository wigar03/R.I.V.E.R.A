/**
 * Contrato normalizado entre el proveedor de telemetría y la interfaz.
 *
 * Los componentes solo conocen estos tipos. El modo mock y el modo live
 * entregan exactamente las mismas estructuras; cualquier diferencia de formato
 * del backend se resuelve en ./adapter.ts.
 *
 * Reglas:
 * - Un valor ausente es null, nunca 0.
 * - Las fechas son cadenas ISO 8601 con zona (UTC recomendado).
 * - kind indica qué representa el dato; simulated indica si salió de la demostración.
 */

/** Qué representa un dato. */
export type DatumKind = 'measured' | 'estimated' | 'configured';

export interface Datum<T> {
  value: T | null;
  /** Unidad mostrada. null cuando no aplica (estados booleanos o textos). */
  unit: string | null;
  kind: DatumKind;
  /** true si el valor proviene de la simulación local. */
  simulated: boolean;
}

export type DataMode = 'mock' | 'live';

/** Estado combinado que ve el visitante. */
export type ConnectionStatus =
  | 'connecting' // primera solicitud en curso (Render puede estar despertando)
  | 'live' // servidor accesible y última lectura dentro del umbral
  | 'stale' // hay lectura, pero supera el umbral de antigüedad
  | 'disconnected' // servidor inaccesible o robot sin lecturas
  | 'error' // respuesta inválida o error HTTP del backend
  | 'demo'; // datos simulados, identificados como tales

/** Accesibilidad del backend, separada de la recepción de telemetría del robot. */
export type BackendReachability = 'unknown' | 'reachable' | 'unreachable' | 'error';

export interface DeviceInfo {
  deviceId: string | null;
  /** Fecha de la última lectura recibida por el backend (ISO). */
  lastSeenAt: string | null;
  /** Lo que informa el backend sobre si el robot está conectado; null si no lo informa. */
  reportedOnline: boolean | null;
}

export interface EnvironmentReading {
  /** Temperatura del aire en la copa (Carrier), °C. */
  temperature: Datum<number>;
  /** Humedad relativa del aire, %. */
  airHumidity: Datum<number>;
  /** Luz ambiental en escala relativa 0–100. No es lux. */
  light: Datum<number>;
  /** Presión atmosférica, kPa, si el firmware la envía. */
  pressure: Datum<number>;
}

export interface SoilReference {
  /** Maceta donde está el sensor capacitivo (índice 0–2). Siempre la maceta 2 → índice 1. */
  potIndex: number;
  /** Humedad relativa 0–100 según la calibración seco/húmedo. Solo esta maceta. */
  moisture: Datum<number>;
  /** Lectura cruda del ADC, sin calibrar. */
  raw: Datum<number>;
}

export interface DrainState {
  /** El sensor de agua del colector compartido detecta agua. */
  detected: Datum<boolean>;
  /** Maceta a la que se atribuye el drenaje (la del ciclo activo), si se conoce. */
  attributedPotIndex: number | null;
}

export interface ActuatorState {
  pumpOn: Datum<boolean>;
  /** Distancia del sensor ultrasónico, cm, si se transmite. */
  distanceCm: Datum<number>;
  /** Agua restante estimada en el depósito, %, si el firmware la calcula. */
  tankPercent: Datum<number>;
}

export type CycleAction = 'irrigate' | 'prime' | 'demo' | 'stop' | 'unknown';
export type CycleStatus =
  | 'pending'
  | 'accepted'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'unknown';

export interface IrrigationCycle {
  /** Hay una orden o ciclo en curso. */
  active: boolean;
  action: CycleAction | null;
  status: CycleStatus | null;
  potIndex: number | null;
  /** El modelo considera que corresponde regar. */
  shouldWater: boolean | null;
  /** Explicación textual del backend o de la simulación. */
  reason: string | null;
  /** Agua entregada hoy, ml (estimada por tiempo de bomba). */
  waterTodayMl: Datum<number>;
  /** Límite diario configurado, ml. */
  dailyCapMl: Datum<number>;
  nextAllowedAt: string | null;
}

export interface PotState {
  index: number;
  /** Nombre que informa el robot o la configuración. */
  label: string | null;
  /** Plantas registradas en la maceta por el backend. */
  plants: string[];
  kc: Datum<number>;
  /** Dosis calculada actualmente, ml. */
  currentDoseMl: Datum<number>;
  /** Déficit acumulado estimado, ml. */
  deficitMl: Datum<number>;
  /** Factor de ajuste por drenaje (1 = sin ajuste). */
  adjustFactor: Datum<number>;
  /** El plan actual incluye regar esta maceta. */
  willWater: boolean | null;
  hasSensor: boolean | null;
  angleDeg: Datum<number>;
  lastIrrigationAt: string | null;
  lastDrainAt: string | null;
}

export interface IrrigationEvent {
  id: string;
  at: string;
  potIndex: number | null;
  volumeMl: Datum<number>;
  drained: boolean | null;
  message: string | null;
}

export interface HistoryPoint {
  /** Momento de medición (o recepción si el origen no lo informa), ISO. */
  at: string;
  temperature: number | null;
  airHumidity: number | null;
  light: number | null;
  soilMoisture: number | null;
}

export interface TelemetryReading {
  id: string | null;
  measuredAt: string | null;
  receivedAt: string | null;
  environment: EnvironmentReading;
  soil: SoilReference;
  drain: DrainState;
  actuators: ActuatorState;
}

/** Datos que un origen (mock o adaptador live) entrega en cada actualización. */
export interface TelemetryFrame {
  device: DeviceInfo;
  reading: TelemetryReading | null;
  /** Antigüedad de la lectura según el servidor, en segundos, si la informa. */
  serverAgeSeconds: number | null;
  cycle: IrrigationCycle | null;
  pots: PotState[] | null;
  events: IrrigationEvent[] | null;
  history: HistoryPoint[] | null;
}

export type TelemetryErrorKind = 'timeout' | 'network' | 'http' | 'payload' | 'config';

export interface TelemetryError {
  kind: TelemetryErrorKind;
  message: string;
  status?: number;
  at: string;
}

/** Estado completo que consumen los componentes. */
export interface TelemetryState {
  mode: DataMode;
  /** true si el visitante pidió ver la demostración aunque el modo sea live. */
  demoOverride: boolean;
  status: ConnectionStatus;
  backend: BackendReachability;
  device: DeviceInfo;
  reading: TelemetryReading | null;
  cycle: IrrigationCycle | null;
  pots: PotState[];
  events: IrrigationEvent[];
  history: HistoryPoint[];
  /** Antigüedad actual de la última lectura, en segundos. */
  ageSeconds: number | null;
  /** Momento local (ms) de la última respuesta válida. */
  lastSuccessAt: number | null;
  lastError: TelemetryError | null;
  /** Errores consecutivos desde el último éxito. */
  failures: number;
  /** Momento local (ms) del próximo intento tras un error. */
  nextRetryAt: number | null;
  /** Hay una solicitud en curso. */
  loading: boolean;
}
