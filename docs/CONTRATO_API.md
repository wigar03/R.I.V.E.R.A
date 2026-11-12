# Contrato frontend ↔ backend de R.I.V.E.R.A.

Estado: **parcialmente acordado**. Las rutas de la sección 3 existen en el backend
publicado (verificado contra `https://rivera-backend.onrender.com/openapi.json`, API
0.2.0, el 12-nov-2026). Lo marcado como **Propuesto** todavía no existe y queda
pendiente de acuerdo con el responsable del backend.

## 1. Configuración del frontend

| Variable | Valor / defecto | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://rivera-backend.onrender.com` | **Obligatoria.** Única fuente de la URL base. Se lee solo en `frontend/lib/config.ts` y se normaliza (sin barras dobles). |
| `NEXT_PUBLIC_DATA_MODE` | `mock` | `mock`: demostración local identificada. `live`: backend real. |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` | `7000` | Intervalo de consulta HTTP. Alinear con el envío del MKR (5–10 s). |
| `NEXT_PUBLIC_STALE_AFTER_MS` | `30000` | Pasado este umbral una lectura deja de mostrarse “En vivo”. |
| `NEXT_PUBLIC_REQUEST_TIMEOUT_MS` | `20000` | Tiempo máximo por solicitud (Render puede despertar lento). |
| `NEXT_PUBLIC_MAX_BACKOFF_MS` | `60000` | Espera máxima entre reintentos. |
| `NEXT_PUBLIC_HISTORY_MINUTES` | `60` | Ventana de las gráficas. |
| `NEXT_PUBLIC_TELEMETRY_TRANSPORT` | `poll` | `poll` o `sse` (sección 6). |
| `NEXT_PUBLIC_TELEMETRY_STREAM_PATH` | `/api/public/stream` | Ruta SSE propuesta. |
| `NEXT_PUBLIC_TIMEZONE` | `America/Managua` | Zona con la que se muestran las horas. |

Las variables `NEXT_PUBLIC_*` se incrustan en el JavaScript del navegador durante la
compilación: **nunca** contienen secretos, y cambiarlas en Vercel exige un nuevo despliegue.

## 2. Arquitectura en el frontend

```text
componentes React ──► useTelemetry() ──► TelemetryStore (una sola suscripción)
                                             │
                          ┌──────────────────┴──────────────────┐
                    createMockSource()                   createLiveSource()
                    (lib/telemetry/mock.ts)              (polling + SSE opcional)
                                                               │
                                                     createRenderAdapter()
                                                     lib/telemetry/adapter.ts  ◄── único archivo
                                                                                    que conoce rutas
                                                                                    y formatos
```

Los dos orígenes entregan el mismo tipo normalizado (`lib/telemetry/types.ts`). Si el
backend cambia un campo o una ruta, **solo se modifica `adapter.ts`**.

## 3. Rutas públicas (existentes)

Todas son `GET`, sin autenticación, respuesta `application/json`.

| Ruta | Uso en la web | Frecuencia |
| --- | --- | --- |
| `/api/public/status` | Estado, última lectura y ciclo activo. **Esencial**: si falla, la actualización falla. | cada intervalo |
| `/api/public/irrigation` | Decisión de riego, agua del día, dosis por maceta | cada intervalo (complementaria) |
| `/api/public/readings?minutes=60&limit=360` | Historial para las gráficas, más antiguo primero | cada 60 s |
| `/api/public/pots` | Configuración de macetas | al iniciar y cada 5 min |

Un fallo de una ruta complementaria no invalida la actualización: se conserva su último valor.

### 3.1 `GET /api/public/status`

```json
{
  "online": true,
  "last_seen": "2026-11-12T16:09:21.702236Z",
  "seconds_since": 4.2,
  "latest": {
    "id": 11,
    "device_id": "mkr-1",
    "measured_at": null,
    "received_at": "2026-11-12T16:09:21.702236Z",
    "temperature": 21.4,
    "air_humidity": 69.0,
    "pressure": 99.2,
    "light": 24.0,
    "soil_moisture": 12.9,
    "soil_raw": 567,
    "pump_on": false,
    "drain_detected": null,
    "distance_cm": null,
    "tank_percent": null
  },
  "active_command": { "action": "irrigate", "pot_id": 0, "status": "running" }
}
```

- `latest` y `active_command` pueden ser `null`.
- `seconds_since` es **imprescindible**: la web calcula la antigüedad con el reloj del
  servidor, porque el reloj del teléfono del visitante puede estar desfasado.
- `distance_cm` y `tank_percent` son **Propuestos** (opcionales). Si el firmware no los
  envía, la web muestra “No disponible”.

### 3.2 `GET /api/public/irrigation`

```json
{
  "should_water": false,
  "reason": "Esperando lecturas del sensor de humedad",
  "water_today_ml": 0.0,
  "daily_cap_ml": 150.0,
  "next_allowed_at": null,
  "pots": [
    { "pot_id": 0, "name": "Maceta de arriba", "kc": 0.3, "adjust": 1.0,
      "carry_ml": 0.0, "needed_ml": 15.0, "will_water": true,
      "last_irrigation_at": null, "last_drain_at": null }
  ]
}
```

Interpretación usada por la web (**confirmar con backend**): `needed_ml` = dosis actual
estimada; `carry_ml` = déficit acumulado estimado; `adjust` = factor de ajuste por drenaje.
`last_irrigation_at` y `last_drain_at` por maceta son **Propuestos**; sin ellos la web
muestra “No registrado”.

### 3.3 `GET /api/public/readings` y `GET /api/public/pots`

`readings`: arreglo de objetos con el mismo formato que `latest`.
`pots`: `[{ "id": 0, "name": "…", "kc": 0.3, "has_sensor": false, "plants": ["…"], "angle": 25 }]`.

> Observación: la configuración publicada hoy en `/pots` (cactus y kalanchoes, Kc 0,3–0,4)
> difiere de los perfiles del documento técnico (albahaca 1,0; hierbabuena 0,8; sábila 0,35).
> La web muestra los perfiles del documento como “iniciales” y, en un bloque aparte,
> lo que informa el robot como “Registrado en el robot”. Conviene que el equipo decida
> qué configuración se exhibe en la feria.

## 4. Tipos, unidades y valores nulos

| Campo | Unidad | Tipo de dato en la web | Rango aceptado |
| --- | --- | --- | --- |
| `temperature` | °C | medido | −20 a 80 |
| `air_humidity` | % HR | medido | 0 a 100 |
| `light` | escala relativa 0–100 (**no lux**) | medido | 0 a 100 |
| `pressure` | kPa | medido | 50 a 120 |
| `soil_moisture` | % relativo, **solo maceta 2** | medido | 0 a 100 |
| `soil_raw` | cuenta ADC | medido | 0 a 4095 |
| `pump_on`, `drain_detected` | booleano | medido | — |
| `distance_cm` (prop.) | cm | medido | 0 a 500 |
| `tank_percent` (prop.) | % | estimado | 0 a 100 |
| `needed_ml`, `carry_ml`, `water_today_ml` | ml | estimado (por tiempo de bomba) | ≥ 0 |
| `kc`, `angle`, `daily_cap_ml` | —, °, ml | configurado | — |

- Un dato ausente se envía como `null` (o se omite). **Nunca** usar `0` para “sin dato”.
- Un valor fuera de rango se trata como no disponible.
- Fechas: ISO 8601 **con zona**, preferiblemente UTC (`2026-11-12T16:09:21Z`). Si llegan sin
  zona se interpretan como UTC. Enviar `measured_at` (hora del MKR) cuando se conozca y
  conservar `received_at` (hora del servidor).
- El drenaje es un sensor compartido; se atribuye a la maceta del ciclo activo.

## 5. Estados

**Conexión** (calculados en `lib/telemetry/store.ts`):

| Estado | Condición |
| --- | --- |
| Conectando | Primera solicitud en curso |
| En vivo | Servidor accesible y `seconds_since` ≤ umbral |
| Datos desactualizados | Servidor accesible y `seconds_since` > umbral |
| Desconectado | Servidor inaccesible (red, CORS, timeout) o robot sin ninguna lectura |
| Error de conexión | HTTP ≠ 2xx o JSON con formato inválido |
| Demostración | Modo `mock` o demostración elegida por el visitante |

La web distingue **conectividad HTTP** (el servidor responde) de **recepción de
telemetría** (el robot envió lecturas recientes).

**Órdenes / ciclo** (`active_command.status`): `pending`, `accepted`, `running`,
`completed`, `failed`, `cancelled`, `expired`. Acciones: `irrigate`, `prime`, `demo`, `stop`.

## 6. Tiempo real

Hoy: **polling HTTP** cada `NEXT_PUBLIC_POLL_INTERVAL_MS`, con espera exponencial ante
errores (hasta `NEXT_PUBLIC_MAX_BACKOFF_MS`), pausa con la pestaña oculta y reintento al
volver o al recuperar la red. Nunca hay dos solicitudes simultáneas.

**Propuesto (SSE):** `GET /api/public/stream`, `text/event-stream`, eventos
`event: status` cuyo `data` es exactamente el JSON de `/api/public/status`. Activarlo con
`NEXT_PUBLIC_TELEMETRY_TRANSPORT=sse`; si el flujo cae, la web vuelve al polling.
Supabase Realtime o WebSocket requerirían solo un nuevo origen en `lib/telemetry/` con la
misma interfaz `TelemetrySource`.

## 7. Errores

- Respuesta de error recomendada: el formato FastAPI `{"detail": "mensaje"}` con el código HTTP correcto.
- `404` en una ruta complementaria se tolera; en `/api/public/status` produce “Error de conexión”.
- La web nunca sustituye datos reales por simulados en silencio: la demostración solo se
  muestra si el visitante la pide y queda etiquetada.

## 8. CORS (acción pendiente del backend)

Comprobado el 12-nov-2026 con una solicitud preflight:

| Origen | Resultado |
| --- | --- |
| `http://localhost:3000`, `http://127.0.0.1:3000` | Permitido |
| `https://r-i-v-e-r-a.vercel.app` | **Bloqueado** (sin `Access-Control-Allow-Origin`) |

El backend debe autorizar, para `GET` en `/api/public/*`:

```text
https://r-i-v-e-r-a.vercel.app
```

y, si se quieren probar despliegues Preview, la expresión
`^https://r-i-v-e-r-a-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$` (ajustarla al nombre real
del equipo en Vercel). Las rutas públicas no necesitan `allow_credentials`. No usar `*`
junto con credenciales. Si el dominio de producción cambia, actualizar esta lista.

## 9. Funciones administrativas

El backend ya expone `/api/admin/*` con `POST /api/admin/login` y token Bearer. La web
**no** las usa todavía: el laboratorio `/admin` es solo una simulación local y sus
órdenes reales están deshabilitadas (`frontend/lib/commands.ts`). Antes de habilitarlas:

1. Usuarios individuales (no una contraseña compartida) y roles verificados en el servidor.
2. Token de corta duración, guardado en memoria o en cookie `HttpOnly; Secure; SameSite=Strict`, nunca en `localStorage` ni en variables `NEXT_PUBLIC_`.
3. Límites de dosis, de frecuencia y de volumen diario validados en el servidor.
4. Órdenes con identificador, caducidad e idempotencia; registro de quién las emitió.
5. CORS para `/api/admin/*` restringido al dominio de producción.
6. La secuencia física sigue en el firmware; la web solo pide acciones de alto nivel y muestra confirmaciones.

## 10. Cómo conectar o ajustar el adaptador

1. Configurar `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_DATA_MODE=live` (local en `frontend/.env.local`, producción en Vercel) y redesplegar.
2. Autorizar el origen de Vercel en CORS (sección 8).
3. Si cambia una ruta: editar `ENDPOINTS` en `frontend/lib/telemetry/adapter.ts`.
4. Si cambia un campo: editar `mapReading`, `mapCycle` o `mapPots` en el mismo archivo.
5. Si se añade SSE: implementar la sección 6 y activar `NEXT_PUBLIC_TELEMETRY_TRANSPORT=sse`.
6. Verificar con `npm run typecheck && npm run build` y abrir el observatorio: el
   indicador debe pasar a “En vivo” solo con lecturas recientes del MKR.
