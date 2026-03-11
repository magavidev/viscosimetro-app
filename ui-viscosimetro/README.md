# UI Viscosimetro

Frontend React + TypeScript + Vite para el proyecto `Proyecto_Viscosimetro`.

## Requisitos

- Node recomendado: `20.19.0` (ver `.nvmrc`)
- Node permitido: `>=20.19.0 <21 || >=22.12.0`
- npm: `>=10`
- `engine-strict=true` activo en `.npmrc`

## Setup local

```bash
nvm install
nvm use
npm ci
```

## Scripts

- `npm run dev`: entorno de desarrollo
- `npm run typecheck`: chequeo TypeScript
- `npm run lint`: análisis estático ESLint
- `npm run build`: `typecheck` + build de Vite
- `npm run check`: lint + build (verificación completa)
- `npm run preview`: servir build local

## Variables de entorno

- `VITE_WS_URL` (opcional): URL del WebSocket de telemetría.
  - Default: `ws://localhost:8781`

## Nota de integración

El backend en `main.py` publica el contenido de `ui-viscosimetro/dist` y mantiene la condición de arranque con Arduino conectado.
