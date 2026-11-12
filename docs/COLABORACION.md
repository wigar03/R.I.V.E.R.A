# Colaboración y ramas

```text
frontend ── pull request ──┐
                          ├── develop ── pull request ── main
backend ─── pull request ──┘
```

| Rama | Uso |
| --- | --- |
| `main` | Versiones aprobadas; rama de producción prevista |
| `develop` | Integración y revisión de los dos colaboradores |
| `frontend` | Interfaz, experiencia móvil y simulación; nuestro trabajo |
| `backend` | API, datos, autenticación e integración con el robot; otro colaborador |

No se integran `frontend` ni `backend` directamente en `main`. Mantener las tres
ramas de colaboración después de integrar los pull requests; no eliminarlas.

## Cada sesión de trabajo

Con el árbol limpio, elegir la rama que corresponde:

```bash
git fetch origin
git switch frontend
git pull --no-rebase origin frontend
git merge origin/develop
npm ci
```

En backend, sustituir `frontend` por `backend`. El merge trae a la rama de trabajo
los cambios que el otro colaborador ya integró. Si hay conflictos, resolverlos y
verificar el resultado antes de continuar.

Después de editar:

```bash
npm run typecheck
npm run build
git add <archivos-del-cambio>
git commit -m "feat(frontend): describir el cambio"
npm run sync:push
```

`sync:push` exige un árbol limpio, ejecuta **`git pull --no-rebase origin <rama>` antes
de `git push`** y se detiene si falla cualquier paso. Solo admite `frontend` y
`backend`; no usa force push ni guarda cambios automáticamente. También funciona
con `node scripts/sync-push.mjs`, sin instalar dependencias del frontend.

El script no puede obligar al otro colaborador a usarlo. Las reglas del servidor
protegen la integración y los pushes sin sincronizar que no sean fast-forward;
GitHub no puede verificar que una persona haya ejecutado literalmente `git pull`.

## Integración

1. Abrir PR de `frontend` o `backend` hacia `develop`.
2. Revisar el diff y las verificaciones `Flujo de ramas` y `Frontend`.
3. Integrar mediante **merge commit**, conservando la historia común de estas ramas
   permanentes. No usar squash ni rebase merge para este flujo.
4. Cada colaborador vuelve a sincronizar su rama con `origin/develop`.
5. Cuando la versión se apruebe, abrir PR exclusivamente de `develop` hacia `main`.
6. Antes de integrar, actualizar la rama origen con el destino y repetir las
   verificaciones si GitHub informa que quedó desactualizada.

## Protección en GitHub

El workflow `.github/workflows/ci.yml` rechaza los PR con otro origen/destino y
comprueba tipos y compilación del frontend. Para que sea obligatorio, las reglas
de GitHub deben estar **activas** para `main` y `develop` con:

- Pull request obligatorio, sin bypass de administradores.
- Checks obligatorios `Flujo de ramas` y `Frontend`, con rama actualizada.
- Bloqueo de eliminación y force push.
- Resolución de conversaciones antes de integrar.

La configuración del servidor no se activa por existir este documento o el
workflow: se administra en Settings → Rules → Rulesets. Verificar allí su estado
si se transfiere el repositorio o se cambia su configuración.

El autor no puede aprobar su propio PR. Las reglas permiten integrar con los
checks correctos sin exigir un número mínimo de aprobaciones; el equipo puede
exigir una aprobación cuando acuerde su disponibilidad de revisión.

## Separación del código

- `frontend/`: aplicación Next.js existente y recursos públicos.
- `backend/`: espacio del servicio y la persistencia; implementación pendiente.
- `docs/`: acuerdos de arquitectura y contratos de API entre ambos.
- Raíz: lockfile único, comandos comunes, automatización y documentación.

No mover `frontend/lib/model.ts` al backend: hoy contiene el modelo del simulador
que se ejecuta en el navegador. Compartir tipos con un paquete común solo cuando
exista un contrato real y ambos lados lo necesiten.

## Vercel

Configurar **Root Directory = `frontend`**, **Framework = Next.js** y mantener
**Production Branch = `main`**. Habilitar acceso a los archivos fuera del Root
Directory para instalar el workspace desde el lockfile de la raíz.
`frontend/vercel.json` instala desde la raíz con `cd .. && npm ci` y compila la
aplicación con `npm run build`.

`develop` y las ramas de trabajo deben generar Preview. Esta reorganización no
cambia por sí sola los ajustes de la cuenta de Vercel ni confirma despliegues.
Cambiar el Root Directory antes de desplegar una rama que incluya esta estructura;
para producción, coordinar ese ajuste con el primer merge de esta estructura a
`main`, porque la versión anterior todavía tiene la aplicación en la raíz.

Referencia: [monorepos en Vercel](https://vercel.com/docs/monorepos).
