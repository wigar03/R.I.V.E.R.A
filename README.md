# R.I.V.E.R.A.

**Robot Inteligente Vertical de Eco-Riego Automatizado** · prototipo v3.2 · Universidad
Americana (UAM) · II Encuentro Nacional de Robótica MideaBot 2026, categoría Robot Creativo.

Web de exhibición pensada para abrirse desde el celular (QR o NFC): presenta el robot,
muestra su telemetría y explica el recorrido del agua con una corriente que desciende
con el scroll.

## Qué incluye

- **Hero** con la ilustración de diseño del prototipo (identificada como tal).
- **Rivera animada**: trazado SVG sincronizado con el scroll que conecta las secciones,
  se ramifica hacia las tres macetas y termina en la laguna. Alternativa estática con
  `prefers-reduced-motion`.
- **Observatorio IoT**: temperatura, humedad del aire, luz relativa, suelo de referencia
  (solo maceta 2), drenaje, bomba, distancia, depósito y ciclo de riego. Cada dato indica
  si es medido, estimado, configurado o simulado; estado de conexión veraz y antigüedad.
- **Perfiles de las plantas**: albahaca (40 ml, Kc 1,0), hierbabuena (35 ml, Kc 0,8) y
  sábila (25 ml, Kc 0,35), parámetros iniciales sujetos a calibración.
- **Cómo funciona** en siete pasos con detalle técnico desplegable y los componentes.
- **Sostenibilidad**: 20 de 35 tipos de elementos (57,1 %) reciclados o reutilizados.
- **Equipo y documentación** (láminas del prototipo en PDF).
- `/admin`: **laboratorio virtual** de secuencias; no controla el robot.

## Desarrollo local

Requisitos: Node.js 22 o superior y npm. Ejecutar npm siempre desde la raíz.

```bash
git switch frontend
npm ci
cp .env.example frontend/.env.local   # ajustar NEXT_PUBLIC_DATA_MODE
npm run dev                           # http://127.0.0.1:3000
```

```bash
npm run typecheck   # TypeScript
npm run build       # compilación de producción
npm start           # servir la compilación
```

## Datos: modo demostración y modo real

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://rivera-backend.onrender.com` (obligatoria) |
| `NEXT_PUBLIC_DATA_MODE` | `mock` (demostración identificada) o `live` (backend real) |

En `live`, la web consulta `/api/public/status`, `/irrigation`, `/readings` y `/pots`
del backend en Render. Si el servidor no responde, se muestra “Desconectado” y se conserva
la última lectura como antigua; el visitante puede abrir una demostración etiquetada. El
resto de variables opcionales está en [`.env.example`](.env.example).

El contrato completo, el estado de CORS y las instrucciones del adaptador están en
**[docs/CONTRATO_API.md](docs/CONTRATO_API.md)**.

## Estructura

```text
frontend/
  app/                         layout, página pública, /admin, estilos
  components/site/             cabecera y secciones (servidor)
  components/river/            corriente animada (cliente)
  components/observatory/      observatorio y tarjetas
  components/pots/             macetas
  components/lab/              laboratorio virtual
  lib/config.ts                lectura única de variables de entorno
  lib/content.ts               contenido técnico del documento v3.2
  lib/telemetry/               tipos, adaptador, fuentes mock/live, almacén y hook
  lib/model.ts                 modelo del simulador del laboratorio
  lib/commands.ts              interfaz de órdenes futuras (deshabilitada)
docs/CONTRATO_API.md           contrato frontend ↔ backend
docs/COLABORACION.md           ramas, PR y Vercel
```

## Exactitud técnica

No hay sensor de humedad en cada maceta: la necesidad se calcula con el ambiente y el
perfil de cada especie; el sensor capacitivo de la maceta 2 es una referencia. El drenaje
se detecta en un colector compartido. Se riega una maceta a la vez. El volumen se
dosifica por tiempo de bomba y caudal calibrado: no hay caudalímetro, y el caudal de
10 ml/s del documento es un ejemplo. Las correcciones son reglas de control, no un
modelo entrenado. No se declara un ahorro de agua medido.

## Despliegue en Vercel

Proyecto con **Root Directory = `frontend`**, Framework Next.js, Production Branch `main`
y acceso a archivos fuera del Root Directory. `frontend/vercel.json` instala con
`cd .. && npm ci` y compila con `npm run build`.

```bash
vercel link                                   # dentro de frontend/, elegir el proyecto existente
vercel env add NEXT_PUBLIC_API_URL production # https://rivera-backend.onrender.com
vercel env add NEXT_PUBLIC_DATA_MODE production
vercel --prod                                 # o merge a main si el despliegue es por Git
```

Las variables `NEXT_PUBLIC_*` se fijan en la compilación: tras cambiarlas, volver a
desplegar. No incluir secretos en ellas. El backend debe autorizar el dominio de
producción en CORS (ver contrato, sección 8).

## Verificación realizada

Chrome (Playwright) emulando 320, 360, 375, 390, 430, 768, 1024 y 1440 px y 844×390
horizontal: sin desbordamiento horizontal ni controles táctiles menores de 44 px.
Estados probados interceptando el backend: conectando, desconectado, en vivo, pérdida de
conexión con última lectura conservada, desactualizado, error 500, recuperación, valores
nulos y movimiento reducido. **Pendiente:** Safari real en iPhone, Chrome en un Android
físico y lectura desde NFC/QR.

<details>
<summary>Captura móvil</summary>

![Vista móvil de R.I.V.E.R.A.](frontend/public/vista-movil.png)

</details>

## Colaboración

Trabajo en `frontend`, integración por PR `frontend → develop → main`, usando
`npm run sync:push`. Ver [docs/COLABORACION.md](docs/COLABORACION.md).
