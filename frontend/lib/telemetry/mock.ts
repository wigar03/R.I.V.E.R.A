/**
 * Origen de demostración.
 *
 * Determinista: cada valor es una función del reloj, sin números aleatorios,
 * de modo que dos visitantes ven la misma curva en el mismo minuto. Todo dato
 * sale marcado con simulated = true y la interfaz lo etiqueta como demostración.
 */
import { datum } from './adapter';
import { plantProfiles } from '../content';
import type { SourceCallbacks, TelemetrySource } from './source';
import type { HistoryPoint, IrrigationCycle, PotState, TelemetryFrame, TelemetryReading } from './types';

const TAU = Math.PI * 2;
const CYCLE_S = 120; // un ciclo simulado cada dos minutos
const UPDATE_MS = 5000;
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

export function mockEnvironment(t: number) {
  return {
    temperature: round(27.6 + 1.2 * Math.sin((TAU * t) / 1800) + 0.3 * Math.sin((TAU * t) / 240)),
    airHumidity: round(64 - 4 * Math.sin((TAU * t) / 1800) + Math.sin((TAU * t) / 300)),
    light: round(62 + 10 * Math.sin((TAU * t) / 2400) + 3 * Math.sin((TAU * t) / 200)),
    soilMoisture: round(48 + 4 * Math.sin((TAU * t) / 3600) + 1.2 * Math.sin((TAU * t) / 420)),
  };
}

function cycleAt(t: number) {
  const n = Math.floor(t / CYCLE_S);
  const phase = t - n * CYCLE_S;
  const potIndex = n % 3;
  return {
    n,
    phase,
    potIndex,
    pumping: phase >= 62 && phase < 67,
    active: phase >= 58 && phase < 80,
    // Drenaje en uno de cada tres ciclos: el colector detecta agua tras el vuelco.
    draining: n % 3 === 1 && phase >= 70 && phase < 78,
  };
}

function buildFrame(nowMs: number, withHistory: boolean): TelemetryFrame {
  const t = Math.floor(nowMs / 1000);
  const env = mockEnvironment(t);
  const c = cycleAt(t);
  const at = new Date(t * 1000).toISOString();
  const sim = true;

  const reading: TelemetryReading = {
    id: `demo-${t}`,
    measuredAt: at,
    receivedAt: at,
    environment: {
      temperature: datum(env.temperature, '°C', 'measured', sim),
      airHumidity: datum(env.airHumidity, '%', 'measured', sim),
      light: datum(env.light, 'relativa', 'measured', sim),
      pressure: datum(null, 'kPa', 'measured', sim),
    },
    soil: {
      potIndex: 1,
      moisture: datum(env.soilMoisture, '% rel.', 'measured', sim),
      raw: datum(null, 'ADC', 'measured', sim),
    },
    drain: { detected: datum(c.draining, null, 'measured', sim), attributedPotIndex: c.draining ? c.potIndex : null },
    actuators: {
      pumpOn: datum(c.pumping, null, 'measured', sim),
      distanceCm: datum(round(150 + 40 * Math.sin((TAU * t) / 97), 0), 'cm', 'measured', sim),
      tankPercent: datum(round(78 - ((t % 86400) / 86400) * 20, 0), '%', 'estimated', sim),
    },
  };

  const plant = plantProfiles[c.potIndex];
  const cycle: IrrigationCycle = {
    active: c.active,
    action: c.active ? 'irrigate' : null,
    status: c.active ? 'running' : null,
    potIndex: c.active ? c.potIndex : null,
    shouldWater: c.phase >= 50 && c.phase < 80,
    reason: c.active
      ? `Regando ${plant.name.toLowerCase()}: su déficit alcanzó la dosis`
      : 'Acumulando déficit: ninguna maceta alcanzó su dosis',
    waterTodayMl: datum(round(((t % 86400) / 86400) * 90, 0), 'ml', 'estimated', sim),
    dailyCapMl: datum(150, 'ml', 'configured', sim),
    nextAllowedAt: null,
  };

  const pots: PotState[] = plantProfiles.map((p, index) => {
    // Último ciclo pasado que correspondió a esta maceta.
    const back = (c.n - index + 3) % 3;
    const lastN = c.n - back - (back === 0 && c.phase < 67 ? 3 : 0);
    const last = lastN * CYCLE_S + 67;
    const sinceLast = t - last;
    return {
      index,
      label: `Maceta ${index + 1}`,
      plants: [p.name],
      kc: datum(p.kc, null, 'configured', sim),
      currentDoseMl: datum(p.doseMl, 'ml', 'estimated', sim),
      deficitMl: datum(round(Math.min(p.doseMl, (sinceLast / (CYCLE_S * 3)) * p.doseMl), 0), 'ml', 'estimated', sim),
      adjustFactor: datum(1, null, 'estimated', sim),
      willWater: c.active && c.potIndex === index,
      hasSensor: index === 1,
      angleDeg: datum(p.angleDeg, '°', 'configured', sim),
      lastIrrigationAt: new Date(last * 1000).toISOString(),
      lastDrainAt: lastN % 3 === 1 ? new Date((lastN * CYCLE_S + 70) * 1000).toISOString() : null,
    };
  });

  let history: HistoryPoint[] | null = null;
  if (withHistory) {
    history = [];
    for (let s = t - 30 * 60; s <= t; s += 15) {
      const e = mockEnvironment(s);
      history.push({ at: new Date(s * 1000).toISOString(), ...e });
    }
  }

  return {
    device: { deviceId: 'demo-local', lastSeenAt: at, reportedOnline: null },
    reading,
    serverAgeSeconds: 0,
    cycle,
    pots,
    events: null,
    history,
  };
}

export function createMockSource(): TelemetrySource {
  let timer: ReturnType<typeof setInterval> | null = null;
  let cb: SourceCallbacks | null = null;
  const emit = (withHistory: boolean) => cb?.onFrame(buildFrame(Date.now(), withHistory));
  return {
    mode: 'mock',
    start(callbacks) {
      if (timer) return;
      cb = callbacks;
      emit(true);
      timer = setInterval(() => emit(false), UPDATE_MS);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      cb = null;
    },
    refresh() {
      emit(true);
    },
  };
}
