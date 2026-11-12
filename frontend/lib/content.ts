/**
 * Contenido técnico de la página, tomado del Documento técnico v3.2 y de las
 * láminas del prototipo. Los valores marcados como iniciales o de ejemplo están
 * sujetos a calibración en el montaje.
 */

export interface PlantProfile {
  index: number;
  name: string;
  latin: string;
  demand: 'Alta' | 'Media' | 'Baja';
  kc: number;
  doseMl: number;
  angleDeg: number;
  /** Pérdida estimada en un día soleado, según la Tabla 2. */
  dailyLoss: string;
  note: string;
}

export const plantProfiles: PlantProfile[] = [
  {
    index: 0,
    name: 'Albahaca',
    latin: 'Ocimum basilicum',
    demand: 'Alta',
    kc: 1.0,
    doseMl: 40,
    angleDeg: 0,
    dailyLoss: 'Unos 41 ml; riego diario',
    note: 'La de mayor consumo. Su necesidad se calcula con el ambiente y su perfil: no tiene sensor de suelo propio.',
  },
  {
    index: 1,
    name: 'Hierbabuena',
    latin: 'Mentha spicata',
    demand: 'Media',
    kc: 0.8,
    doseMl: 35,
    angleDeg: 60,
    dailyLoss: 'Unos 33 ml; riego casi diario',
    note: 'Maceta de referencia: aquí está enterrado el sensor capacitivo, que contrasta el cálculo del modelo.',
  },
  {
    index: 2,
    name: 'Sábila',
    latin: 'Aloe vera',
    demand: 'Baja',
    kc: 0.35,
    doseMl: 25,
    angleDeg: 120,
    dailyLoss: 'Unos 14 ml; riego cada dos días',
    note: 'Suculenta de bajo consumo. Su necesidad también se estima; no tiene sensor de suelo propio.',
  },
];

export const RETURN_ANGLE_DEG = 180;

export interface FlowStep {
  id: string;
  title: string;
  plain: string;
  technical: string;
}

export const flowSteps: FlowStep[] = [
  {
    id: 'observar',
    title: 'Observar el ambiente',
    plain: 'En la copa del árbol, el MKR IoT Carrier mide la temperatura, la humedad del aire y la luz.',
    technical:
      'Cada minuto calcula la presión de vapor de saturación con la fórmula de Tetens (FAO-56) y el déficit de presión de vapor (VPD), en kPa.',
  },
  {
    id: 'estimar',
    title: 'Estimar la necesidad de agua',
    plain: 'Con esos datos calcula cuánta agua pierde cada planta según su especie. Ningún sensor mide la tierra de cada maceta.',
    technical:
      'ET₀,h = 0,55 · L · VPD^1,13 (modelo simplificado). Cada maceta acumula su déficit Dₖ += f · Kc,ₖ · ET₀,h · Δt · Aₖ / 10, en ml.',
  },
  {
    id: 'seleccionar',
    title: 'Elegir una maceta',
    plain: 'Cuando el déficit de una planta alcanza su dosis, entra en la cola. El robot riega una sola maceta a la vez.',
    technical: 'Si dos coinciden, primero la de mayor relación déficit/dosis. Una maceta con tres dosis en un día queda bloqueada hasta el día siguiente.',
  },
  {
    id: 'orientar',
    title: 'Orientar el brazo',
    plain: 'Con la bomba apagada, el servomotor 2 gira el brazo distribuidor hacia el embudo de esa maceta.',
    technical: 'Ángulos de partida: 0°, 60° y 120° para las macetas y 180° para el retorno. Se afinan al montar.',
  },
  {
    id: 'llenar',
    title: 'Llenar y volcar la cubeta',
    plain: 'La bomba llena la cubeta durante un tiempo calibrado. Después, el servomotor 1 la vuelca y toda la dosis cae de una vez.',
    technical:
      't_b = t₀ + Vₖ / Q. El caudal Q se obtiene midiendo con jeringa el agua de 2, 4 y 6 s de bomba. No hay caudalímetro. Si una dosis no cabe, se reparte en dos volteos.',
  },
  {
    id: 'drenaje',
    title: 'Detectar el drenaje',
    plain: 'El agua que sobra sale por la tapa de la botella hacia un colector común, donde un sensor de agua la detecta.',
    technical: 'Ventana de tres minutos tras cada riego. Como se riega una maceta a la vez, el drenaje se atribuye a la maceta del ciclo.',
  },
  {
    id: 'ajustar',
    title: 'Ajustar la dosis',
    plain: 'Si hubo drenaje, la próxima dosis de esa planta será menor. Si la tierra de referencia contradice al modelo, se corrige.',
    technical:
      'Con drenaje, la dosis baja 15 %; tras cinco riegos sin drenaje, sube 5 %. El sensor capacitivo ajusta el factor global f ±5 %, entre 0,5 y 1,5. Son reglas de control, no un modelo entrenado.',
  },
];

export type ComponentGroup = 'cerebro' | 'medula' | 'agua';

export interface RobotComponent {
  name: string;
  role: string;
  group: ComponentGroup;
  reused?: boolean;
}

export const robotComponents: RobotComponent[] = [
  { name: 'MKR WiFi 1010 + MKR IoT Carrier', role: 'El cerebro, en la copa: mide el ambiente, calcula la sed y decide.', group: 'cerebro' },
  { name: 'Arduino UNO', role: 'La médula, en la base: mueve servos, activa la bomba y lee los sensores auxiliares. Se comunica por I2C.', group: 'medula' },
  { name: 'Servomotor 1 · cubeta', role: 'Vuelca la cubeta dosificadora unos 120° sobre el embudo receptor.', group: 'medula' },
  { name: 'Servomotor 2 · brazo', role: 'Gira el brazo distribuidor hacia uno de los cuatro embudos.', group: 'medula' },
  { name: 'Sensor capacitivo', role: 'Humedad real de referencia, solo en la maceta 2.', group: 'medula' },
  { name: 'Sensor de agua', role: 'Detecta el drenaje en el colector compartido.', group: 'medula' },
  { name: 'Sensor ultrasónico', role: 'Detecta a quien se acerca y enciende los LEDs de los escalones.', group: 'medula' },
  { name: 'Bomba de 5 V', role: 'Recuperada de un dispensador de garrafón. Sube el agua por dentro del tubo.', group: 'agua', reused: true },
  { name: 'Depósito y retorno', role: 'La laguna de la base. El drenaje y el embudo de retorno devuelven el agua.', group: 'agua', reused: true },
];

export const sustainability = {
  reusedTypes: 20,
  totalTypes: 35,
  percent: '57,1',
};

export const team = {
  institution: 'Universidad Americana (UAM)',
  program: 'Ingeniería en Sistemas de Información',
  event: 'II Encuentro Nacional de Robótica MideaBot 2026',
  category: 'Robot Creativo',
  venue: 'UNAN-Managua · 12 de noviembre de 2026',
  advisor: 'Miguel Enrique Espinoza Rayo',
  members: [
    'Elydariana de León García Espinoza',
    'William Antonio García García',
    'Lesther Josías Galeano Meza',
    'Richard Iván Díaz Yáñez',
    'Andrés Sebastián González Maradiaga',
  ],
};

/** Documentos publicados en /public. Para añadir uno, colocar el archivo y registrarlo aquí. */
export const documents = [
  {
    title: 'Láminas del prototipo v3.2',
    description: 'Vistas, cotas, circuito electrónico, cálculo de la sed y distribución de la electrónica.',
    href: '/rivera-v3.2.pdf',
    size: '0,9 MB · PDF',
  },
];
