# R.I.V.E.R.A. 🌱

**Robot Inteligente Vertical de Eco-Riego Automatizado**

Página del proyecto R.I.V.E.R.A. v3.2, Robot Creativo, MideaBot 2026, UNAN-Managua. Una experiencia pensada primero para celulares: los jueces y asistentes podrán descubrir el prototipo desde un enlace NFC o un código QR cuando se publique.

> **Estado: versión preliminar 0.1, demostración local.** Los datos de sensores son ilustrativos. La consola no está conectada al robot y todavía no tiene autenticación. No introducir credenciales ni conectar actuadores reales en esta versión.

## Qué incluye

- Presentación del prototipo y explicación del recorrido del agua.
- Observatorio con cuatro tarjetas y gráficas de ejemplo claramente identificadas.
- Fichas interactivas de albahaca, hierbabuena y sábila.
- Consola de prueba: riego manual, cebado hacia el retorno, calibración temporal y parada.
- Recorrido guionado por las tres macetas con reloj virtual ×10; los tiempos simulados de bomba y servos conservan su duración.
- División de dosis en varias cargas si exceden la capacidad configurada de la cubeta.
- [Láminas completas del prototipo](public/rivera-v3.2.pdf).

## Rutas

| Ruta | Contenido |
| --- | --- |
| `/` | Sitio público y observatorio de demostración |
| `/admin` | Laboratorio de prueba; no es aún un panel protegido |

La navegación pública no enlaza al laboratorio. Conocer u ocultar su dirección no constituye una medida de seguridad.

## Stack

| Capa | Versión / elección |
| --- | --- |
| Framework | Next.js 16.4.5, App Router |
| Interfaz | React 19.3.1 y TypeScript |
| Diseño | CSS adaptable, Lucide React, gráficas SVG |
| Tipografía | DM Sans y Manrope; alternativas Arial y Georgia |
| Despliegue previsto | Vercel |
| Datos y usuarios, siguientes fases | Supabase |
| Comunicación futura con el MKR | HTTPS |

Supabase y la comunicación con el robot aún no están implementados. No se necesitan variables de entorno para esta primera versión. Las fuentes se solicitan a Google Fonts desde el navegador y cuentan con alternativas locales.

## Desarrollo local

Requisitos: Node.js **20.9 o superior**, compatible con Next.js 16, y npm. Usar una versión LTS vigente de Node.js.

```bash
git clone https://github.com/wigar03/R.I.V.E.R.A.git
cd R.I.V.E.R.A
npm ci
npm run dev
```

Abrir [la web](http://127.0.0.1:3000/) o [la consola](http://127.0.0.1:3000/admin). El servidor de desarrollo escucha en el equipo local; esa URL no sirve como destino NFC en otros teléfonos.

```bash
npm run build       # Compilación de producción y validación de tipos
npm run typecheck   # Comprobación explícita de TypeScript
npm start          # Servir una compilación de producción
```

## Estructura

```text
app/
  layout.tsx           Idioma, metadatos y estilos globales
  page.tsx             Página pública
  admin/page.tsx       Consola de demostración
  globals.css          Diseño adaptable y controles móviles
components/
  Rivera.tsx           Interfaz y estado del simulador
lib/
  model.ts             Plantas, calibración, pasos y fases
public/
  prototipo.png        Ilustración extraída de las láminas
  rivera-v3.2.pdf       Documento actualizado del equipo
  vista-movil.png      Captura de la revisión móvil
```

## Referencias del prototipo

| Elemento | Función en v3.2 |
| --- | --- |
| Servo 1, D9 | Vuelca la cubeta |
| Servo 2, D10 | Orienta el brazo distribuidor |
| Relé del UNO, D4 | Activa la bomba |
| Ultrasónico | Detecta presencia al frente |
| Sensor capacitivo | Referencia de suelo, únicamente en la maceta 2 |
| Sensor de agua | Detecta drenaje en el colector común |
| Tres LEDs | Iluminan los escalones |

Dosis iniciales del documento: **40 ml de albahaca, 35 ml de hierbabuena y 25 ml de sábila**. Ángulos de partida del brazo: 0°, 60°, 120° y 180° para el retorno. La capacidad de 40 ml conserva el dato del equipo y debe confirmarse en el montaje.

Caudal de 10 ml/s y tiempo inicial de 2 s son valores de ejemplo, no mediciones reales. El volumen se estima por tiempo; no existe un caudalímetro en esta propuesta. La calibración de la consola vive solo en memoria y se pierde al recargar.

