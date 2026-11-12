/**
 * Modelo del simulador local del laboratorio. Se ejecuta solo en el navegador:
 * no es un servicio de backend ni envía órdenes al robot.
 * Caudal de 10 ml/s y t₀ de 2 s son valores de ejemplo, no mediciones.
 */
import { plantProfiles, RETURN_ANGLE_DEG } from './content';

export type Calibration = { flow: number; prime: number; capacity: number; drain: number; angles: number[] };
export const defaultCalibration: Calibration = {
  flow: 10,
  prime: 2,
  capacity: 40,
  drain: 3,
  angles: [...plantProfiles.map((p) => p.angleDeg), RETURN_ANGLE_DEG],
};

export type Step = { name: string; duration: number; pump?: boolean; volume?: number };

/** Secuencia de un riego: brazo → (llenar → goteo → volcar → regresar) por carga → observar drenaje. */
export function irrigationSteps(dose: number, potIndex: number, config: Calibration): Step[] {
  const target = plantProfiles[potIndex]?.name ?? 'retorno';
  const angle = config.angles[potIndex] ?? config.angles[3];
  const steps: Step[] = [{ name: `Servo 2 · brazo hacia ${target} (${angle}°)`, duration: 1.5 }];
  let remaining = dose;
  while (remaining > 0) {
    const volume = Math.min(remaining, config.capacity);
    steps.push(
      { name: `Bomba · llenando ${volume} ml (t = t₀ + V/Q)`, duration: config.prime + volume / config.flow, pump: true },
      { name: 'Bomba apagada · esperando el goteo', duration: 1 },
      { name: 'Servo 1 · volcando la cubeta', duration: config.drain, volume },
      { name: 'Servo 1 · regresando a carga', duration: 1.5 },
    );
    remaining -= volume;
  }
  steps.push({ name: 'Observando drenaje en el colector', duration: 3 });
  return steps;
}

export function primeSteps(config: Calibration): Step[] {
  return [
    { name: `Servo 2 · brazo hacia el retorno (${config.angles[3]}°)`, duration: 1.5 },
    { name: 'Bomba · cebando la manguera', duration: Math.min(10, config.prime + 10 / config.flow), pump: true },
    { name: 'Bomba apagada · esperando el goteo', duration: 1 },
    { name: 'Servo 1 · vaciando hacia el retorno', duration: config.drain },
    { name: 'Servo 1 · regresando a carga', duration: 1.5 },
  ];
}

export function validCalibration(c: Calibration): boolean {
  return (
    c.flow > 0 && c.flow <= 100 &&
    c.prime >= 0 && c.prime <= 30 &&
    c.capacity > 0 && c.capacity <= 40 &&
    c.drain >= 1 && c.drain <= 30 &&
    c.angles.length === 4 && c.angles.every((a) => a >= 0 && a <= 180)
  );
}
