# Backend de R.I.V.E.R.A.

Directorio de trabajo del colaborador responsable del backend, en la rama `backend`.
Todavía no existe un servidor, una base de datos ni conexión al robot en este repositorio.

La arquitectura propuesta utiliza Supabase y una API HTTPS. La elección del runtime,
el framework y el despliegue de esa API corresponde al trabajo de backend; esta
preparación no introduce Express ni otro servidor sin acordarlo con el equipo.

## Responsabilidad

- API de telemetría, unidades, tiempos de medición/recepción y detección de datos antiguos.
- Autenticación y autorización verificadas en servidor y base de datos.
- Persistencia, migraciones y políticas de acceso de Supabase.
- Cola de órdenes con identificador, caducidad, confirmaciones e idempotencia.
- Validaciones y límites de los comandos de alto nivel enviados al firmware.

Los tiempos de bomba y servos se ejecutan en el firmware. La simulación de
`frontend/lib/model.ts` es una ayuda de demostración; no es un servicio de backend.

## Empezar a colaborar

Desde la raíz del repositorio, con el árbol de trabajo limpio:

```bash
git fetch origin
git switch backend
git pull --no-rebase origin backend
git merge origin/develop
# Implementar y verificar cambios dentro de backend/.
git add backend
git commit -m "feat(backend): describir el cambio"
npm run sync:push
```

Crear un pull request **`backend` → `develop`**. Después de integrarlo, sincronizar
`backend` con `develop` antes de comenzar el siguiente cambio. No enviar cambios a
`main` directamente. Ver [el flujo completo](../docs/COLABORACION.md).

Si el backend usa Node.js, registrar `backend` en los workspaces de la raíz cuando
se añada su `package.json` y actualizar el único `package-lock.json` desde la raíz.
Si utiliza otro runtime, mantener aquí su configuración y dependencias propias.
Documentar las variables necesarias en un `.env.example`, sin valores secretos.

Antes de conectar la interfaz, acordar y versionar el contrato de API en `docs/`:
rutas, payloads, unidades, errores, autenticación y estados de las órdenes.
