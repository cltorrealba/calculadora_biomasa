# Calculadora de Biomasa

App React + Vite + Firebase para conteo celular.

## Flujo de ramas

- `main` o `master`: produccion.
- `develop`: staging estable.
- `feature/*`: cambios nuevos, salen desde `develop` y vuelven a `develop` via PR.
- `hotfix/*`: fixes urgentes, salen desde `main/master`, vuelven a `main/master` y luego se hace merge/cherry-pick a `develop`.

### Flujo recomendado

1. Crear feature: `git checkout -b feature/mi-cambio develop`
2. Abrir PR hacia `develop`
3. Merge a `develop` -> deploy automatico a staging
4. Cuando staging este validado, PR `develop -> main/master`
5. Merge a `main/master` -> deploy automatico a produccion

## CI/CD (GitHub Actions)

Se agregaron workflows en `.github/workflows`:

- `ci.yml`
  - Trigger: `push` y `pull_request`
  - Job `test-build`: `npm ci`, `npm test`, `npm run build`
- `deploy-staging.yml`
  - Trigger: push a `develop`
  - Deploy Hosting target `staging` con `channelId: live` (dominio estable)
- `deploy-production.yml`
  - Trigger: push a `main` o `master`
  - Deploy Hosting target `production` con `channelId: live`

## Firebase Hosting: produccion y staging

### Targets configurados

- Archivo `.firebaserc`:
  - target `production` -> `calculadora-yeast`
  - target `staging` -> `calculadora-yeast-staging`
- Archivo `firebase.json`:
  - hosting multi-target (`production` y `staging`)

### Si el site de staging no existe

```bash
firebase hosting:sites:create calculadora-yeast-staging --project calculadora-yeast
firebase target:apply hosting production calculadora-yeast
firebase target:apply hosting staging calculadora-yeast-staging
```

Si tus Site IDs son distintos, reemplazalos tanto en el comando como en `.firebaserc`.

## Aislamiento de datos Firestore

La app ya no escribe en rutas globales. Ahora usa namespace por entorno:

- `environments/production/shared-history/*`
- `environments/staging/shared-history/*`
- `environments/local/shared-history/*`
- `environments/{namespace}/users/{userId}/sessions/current-session`

### Resolucion de entorno

Definida en `src/lib/environment.js`:

- Variables:
  - `VITE_APP_ENV` (`production|staging|local`)
  - `VITE_FIRESTORE_NAMESPACE` (`production|staging|local`)
  - `VITE_STAGING_HOSTNAMES` (lista CSV de hostnames de staging)
- Fallback de seguridad por hostname:
  - `localhost/127.0.0.1` fuerza `local`
  - Hostnames de staging o que contengan `staging` fuerzan `staging`
  - Evita que staging/local escriba en namespace de produccion por error de variables.

### Reglas de Firestore

Actualizadas en `firestore.rules` para el nuevo arbol:

- `environments/{environment}/shared-history/{recordId}`
- `environments/{environment}/users/{userId}/sessions/{sessionId}`

Deploy de reglas:

```bash
firebase deploy --only firestore:rules
```

## Variables de entorno

`.env.example` incluye:

- credenciales Firebase web app
- `VITE_APP_ENV=local`
- `VITE_FIRESTORE_NAMESPACE=local`
- `VITE_STAGING_HOSTNAMES=calculadora-yeast-staging.web.app,calculadora-yeast-staging.firebaseapp.com`

En GitHub Actions:

- staging build fuerza:
  - `VITE_APP_ENV=staging`
  - `VITE_FIRESTORE_NAMESPACE=staging`
- production build fuerza:
  - `VITE_APP_ENV=production`
  - `VITE_FIRESTORE_NAMESPACE=production`

## Google Auth: Authorized domains

En Firebase Authentication > Settings > Authorized domains agrega:

- `localhost`
- `<SITE_PROD>.web.app`
- `<SITE_PROD>.firebaseapp.com`
- `<SITE_STAGING>.web.app`
- `<SITE_STAGING>.firebaseapp.com`
- Cualquier dominio custom de produccion y staging

## Opcional recomendado: copiar datos Prod -> Staging

Para partir pruebas con datos reales:

1. Mantener el aislamiento en namespace (`production` y `staging`).
2. Ejecutar un proceso administrativo de copia (manual o programado) desde backend/CLI con credenciales de servicio.
3. Bloquear siempre el destino en `staging` (nunca `production`).

Nota: este repositorio deja lista la separacion de namespaces y el flujo CI/CD; la copia administrativa se recomienda ejecutarla como tarea operativa controlada.

## Rulesets recomendados (GitHub)

### `main/master`

- Require pull request before merging
- Require approvals (minimo 1)
- Dismiss stale approvals
- Require conversation resolution
- Require status checks:
  - `CI / test-build`
- Block force pushes
- Block branch deletion

### `develop`

- Require pull request before merging
- Require status checks:
  - `CI / test-build`
- Require conversation resolution
- Block force pushes

## Validacion paso a paso

1. Push a `develop` con un cambio simple.
2. Confirmar en Actions:
   - corre `CI`
   - corre `Deploy Staging`
3. Validar que solo se actualiza el site de staging.
4. En staging, crear/editar registros y confirmar que aparecen solo bajo `environments/staging/...`.
5. Push/merge a `main` o `master`.
6. Confirmar en Actions:
   - corre `CI`
   - corre `Deploy Production`
7. Validar que solo se actualiza el site de produccion.
8. En produccion, validar que los datos quedan en `environments/production/...`.
