import asyncio
import threading
import http.server
import socketserver
import os
import sys
import webbrowser
from bridge.serial_manager import SerialManager
import websockets

# Configuración base (se puede ajustar con variables de entorno)
HTTP_HOST = os.getenv("VISC_HTTP_HOST", "")
WS_HOST = os.getenv("VISC_WS_HOST", "localhost")
HTTP_PORT = int(os.getenv("VISC_HTTP_PORT", "8780"))
WS_PORT = int(os.getenv("VISC_WS_PORT", "8781"))
OPEN_BROWSER = os.getenv("VISC_OPEN_BROWSER", "1").lower() in {"1", "true", "yes"}
ALLOW_NO_DEVICE = os.getenv("VISC_ALLOW_NO_DEVICE", "0").lower() in {"1", "true", "yes"}
BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "ui-viscosimetro", "dist")

# Serial manager y almacenamiento de clientes WS
serial = SerialManager()
connected_clients = set()

# Guardaremos el loop principal aquí
loop = None

# === Servidor Web ===
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def start_http_server():
    try:
        with ReusableTCPServer((HTTP_HOST, HTTP_PORT), Handler) as httpd:
            print(f"🌐 Servidor web activo en http://localhost:{HTTP_PORT}")
            if OPEN_BROWSER:
                webbrowser.open(f"http://localhost:{HTTP_PORT}")
            httpd.serve_forever()
    except OSError:
        print(f"⚠️ Puerto {HTTP_PORT} ya está en uso. Cierra la otra app o cambia el puerto.")

# === Manejo WebSocket ===
async def handle_ws(websocket):
    print("🔌 Cliente WebSocket conectado")
    connected_clients.add(websocket)

    try:
        await websocket.wait_closed()
    finally:
        connected_clients.discard(websocket)
        print("❌ Cliente WebSocket desconectado")

async def start_ws():
    async with websockets.serve(handle_ws, WS_HOST, WS_PORT):
        print(f"📡 WebSocket activo en ws://{WS_HOST or 'localhost'}:{WS_PORT}")
        await asyncio.Future()  # Mantener servidor corriendo

# === Callback para cuando llegan datos del Arduino ===
def on_serial_data(data):
    print(f"[SerialManager] Recibido: {data}")

    # Enviar a todos los clientes WebSocket conectados
    for ws in list(connected_clients):
        try:
            asyncio.run_coroutine_threadsafe(ws.send(data), loop)
        except Exception as e:
            print(f"[WS Error] {e}")

# === Main ===
if __name__ == "__main__":
    try:
        if not os.path.isdir(FRONTEND_DIR):
            raise FileNotFoundError(
                f"Frontend no encontrado en '{FRONTEND_DIR}'. Ejecuta el build de ui-viscosimetro."
            )

        # Iniciar comunicación serial
        try:
            serial.connect()
            serial.add_callback(on_serial_data)
            serial.start_listening()
        except Exception as serial_error:
            if not ALLOW_NO_DEVICE:
                raise
            print(
                "⚠️ Arduino no encontrado. Continuando en modo desarrollo "
                f"sin dispositivo porque VISC_ALLOW_NO_DEVICE=1 ({serial_error})."
            )

        # Guardamos el event loop PRINCIPAL antes de lanzarlo
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Servidor web en segundo hilo
        threading.Thread(target=start_http_server, daemon=True).start()

        # Servidor WebSocket en el loop principal
        loop.run_until_complete(start_ws())

    except KeyboardInterrupt:
        print("\n🛑 Cierre solicitado por usuario.")
    except Exception as e:
        print(f"❌ Error al iniciar sistema: {e}")
    finally:
        try:
            serial.close()
        except Exception:
            pass
