export const plants = [
  { id: 0, name: 'Albahaca', latin: 'Ocimum basilicum', profile: 'Demanda alta', dose: 40, kc: 1, angle: 0, icon: '🌿' },
  { id: 1, name: 'Hierbabuena', latin: 'Mentha spicata', profile: 'Maceta de referencia', dose: 35, kc: .8, angle: 60, icon: '🍃' },
  { id: 2, name: 'Sábila', latin: 'Aloe vera', profile: 'Demanda baja', dose: 25, kc: .35, angle: 120, icon: '🪴' },
];
export type Calibration = { flow: number; prime: number; capacity: number; drain: number; angles: number[] };
export const defaultCalibration: Calibration = { flow: 10, prime: 2, capacity: 40, drain: 3, angles: [0, 60, 120, 180] };
export type Step = { name: string; duration: number; pump?: boolean; volume?: number };
export function irrigationSteps(dose: number, target: string, config: Calibration): Step[] {
  const plantIndex = plants.findIndex(p => p.name === target);
  const angle = config.angles[plantIndex < 0 ? 3 : plantIndex];
  const steps: Step[] = [{ name: `Servo 2 · apuntando a ${target} (${angle}°)`, duration: 1.5 }];
  let remaining = dose;
  while (remaining > 0) {
    const volume = Math.min(remaining, config.capacity);
    steps.push({ name: `Bomba · llenando ${volume} ml`, duration: config.prime + volume / config.flow, pump: true },
      { name: 'Bomba apagada · esperando el goteo', duration: 1 },
      { name: 'Servo 1 · volcando la cubeta', duration: config.drain, volume },
      { name: 'Servo 1 · volviendo a carga', duration: 1.5 });
    remaining -= volume;
  }
  steps.push({ name: 'Observando drenaje en el colector', duration: 3 });
  return steps;
}
export const phases = [
  { n:'01', name:'Explorar y demostrar', state:'Versión de hoy', body:'Web pública, explicación del prototipo, sensores de ejemplo y consola de pruebas con cebado, riego y reloj ×10.', goal:'Aceptar el diseño y validar los recorridos en celular.', done:true },
  { n:'02', name:'Conectar las lecturas', state:'Siguiente', body:'Supabase, API HTTPS y envío desde el MKR. Sensores reales, hora de última lectura y detección de desconexión.', goal:'Ver una lectura del prototipo en la web y reconocer cuándo deja de llegar.' },
  { n:'03', name:'Operar con acceso privado', state:'Planificada', body:'Inicio de sesión, permisos de administrador, calibración persistente y órdenes con confirmación, caducidad e identificador.', goal:'Ejecutar una orden una sola vez y recibir su resultado desde el robot.' },
  { n:'04', name:'Preparar la exhibición', state:'Planificada', body:'Demostración ×10 en firmware, límites de agua, historial, pruebas de reconexión y publicación en Vercel con enlace NFC + QR.', goal:'Ensayar la visita completa y una caída de internet sin repetir riegos.' },
];
