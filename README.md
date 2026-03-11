# Proyecto Viscosimetro

Aplicación de control para viscosímetro/densímetro con:

- Backend Python (`main.py`) para serial + WebSocket + servidor HTTP estático.
- Frontend React/Vite en `ui-viscosimetro`.

## Estructura principal

- `main.py`: punto de entrada oficial del backend.
- `bridge/serial_manager.py`: manejo del puerto serial.
- `ui-viscosimetro/`: frontend.
- `viscosimetro_app.spec`: empaquetado con PyInstaller.

## Flujo de ejecución

1. `main.py` valida que exista `ui-viscosimetro/dist`.
2. `main.py` intenta conectar Arduino.
3. Si Arduino está conectado, levanta:
   - HTTP para frontend estático (`8780` por defecto).
   - WebSocket (`8781` por defecto).

## Variables de entorno backend

- `VISC_HTTP_HOST` (default: `""`)
- `VISC_HTTP_PORT` (default: `8780`)
- `VISC_WS_HOST` (default: `"localhost"`)
- `VISC_WS_PORT` (default: `8781`)
- `VISC_OPEN_BROWSER` (default: `1`)

## Desarrollo frontend

Ver `ui-viscosimetro/README.md` para setup y scripts.

### Variable de entorno frontend

- `VITE_WS_URL` (opcional, default: `ws://localhost:8781`)

## Nota de mantenimiento

- `main.py` es el entrypoint operativo.
- `bridge/bridge.py` se mantiene como referencia legacy y no debe usarse como punto de arranque principal.

## Empaquetado (macOS y Windows)

El empaquetado debe ejecutarse en cada sistema operativo destino.
No se recomienda cross-compiling con PyInstaller.

### Requisitos de build

- Python con entorno virtual del proyecto (`.venv`)
- Dependencias de `requirements.txt` instaladas
- Node/npm compatibles (según `ui-viscosimetro/.nvmrc` y `package.json`)

### Comando único de release

```bash
python scripts/build_release.py
```

Opciones útiles:

- `python scripts/build_release.py --skip-check`
- `python scripts/build_release.py --skip-frontend`

Salida esperada:

- `dist/viscosimetro_app/` (ejecutable para el SO actual)
