export const plants = [
  { id: 0, name: 'Albahaca', latin: 'Ocimum basilicum', profile: 'Demanda alta', dose: 40, kc: 1, angle: 0, icon: '🌿' },
  { id: 1, name: 'Hierbabuena', latin: 'Mentha spicata', profile: 'Maceta de referencia', dose: 35, kc: .8, angle: 60, icon: '🍃' },
  { id: 2, name: 'Sábila', latin: 'Aloe vera', profile: 'Demanda baja', dose: 25, kc: .35, angle: 120, icon: '🪴' },
];
export type Calibration = { flow: number; prime: number; capacity: number; drain: number; angles: number[] };
export const defaultCalibration: Calibration = { flow: 10, prime: 2, capacity: 40, drain: 3, angles: [0, 60, 120, 180] };
