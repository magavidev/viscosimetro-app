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
3. Si Arduino está conectado, o si `VISC_ALLOW_NO_DEVICE=1`, levanta:
   - HTTP para frontend estático (`8780` por defecto).
   - WebSocket (`8781` por defecto).

## Variables de entorno backend

- `VISC_HTTP_HOST` (default: `""`)
- `VISC_HTTP_PORT` (default: `8780`)
- `VISC_WS_HOST` (default: `"localhost"`)
- `VISC_WS_PORT` (default: `8781`)
- `VISC_OPEN_BROWSER` (default: `1`)
- `VISC_ALLOW_NO_DEVICE` (default: `0`)
  - Con `1`, permite arrancar backend para desarrollo aunque no haya Arduino conectado.

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
- `python scripts/build_release.py --npm-cmd C:\ruta\al\node\npm.cmd`

Salida esperada:

- `.release/pyinstaller/dist/viscosimetro_app/` (ejecutable para el SO actual)

Los artefactos de empaquetado quedan solo en local bajo `.release/` y no se versionan.

### Flujo recomendado para trabajar limpio en Windows y macOS

Mantén dos tipos de clon por sistema operativo:

- clon de desarrollo: para programar, probar y hacer push a GitHub
- clon de release: solo para empaquetar localmente

Flujo sugerido:

1. Desarrolla normalmente en tu clon de trabajo y sube cambios a GitHub.
2. Crea un tag o usa un commit específico cuando quieras empaquetar.
3. En el clon de release de Windows o macOS, haz checkout de ese tag/commit.
4. Crea el entorno local (`.venv`), instala dependencias y ejecuta `python scripts/build_release.py`.
5. Toma el binario generado desde `.release/pyinstaller/dist/viscosimetro_app/`.

Notas:

- El `.spec` sí se versiona en Git para que el empaquetado sea reproducible en ambos sistemas.
- `.venv/`, `.release/`, `ui-viscosimetro/dist/` y otros artefactos quedan ignorados por Git.
- El build debe ejecutarse en cada sistema operativo destino; no se recomienda cross-compiling.
- Si no quieres instalar Node globalmente en la máquina de release, puedes usar un Node portable y pasarlo con `--npm-cmd`.
