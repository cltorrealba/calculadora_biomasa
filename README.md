# Calculadora de Biomasa

Webapp React + Vite + Tailwind para conteo celular y cálculo de concentración/viabilidad.

## Requisitos

- Node.js y npm
- Firebase CLI (instalado globalmente)

## Desarrollo

1) Instalar dependencias:

   npm install

2) Iniciar servidor de desarrollo:

   npm run dev

## Build

   npm run build

El output queda en dist/ y está listo para Firebase Hosting.

## Despliegue en Firebase

1) Iniciar sesión en Firebase:

   firebase login

2) Inicializar Hosting (si aún no lo hiciste):

   firebase init hosting

   - Public directory: dist
   - Configure as a single-page app: Yes
   - Set up automatic builds: No

3) Asociar el proyecto (si aún no existe .firebaserc):

   firebase use --add

4) Desplegar:

   firebase deploy





