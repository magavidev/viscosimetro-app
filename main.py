# main.py

import asyncio
import threading
import http.server
import socketserver
import os
import webbrowser
from bridge.serial_manager import SerialManager
import websockets

# Puertos y rutas
HTTP_PORT = 8780
WS_PORT = 8781
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "ui-viscosimetro", "dist")

# Serial manager y almacenamiento de clientes WS
serial = SerialManager()
connected_clients = set()

# Guardaremos el loop principal aquí
loop = None

# === Servidor Web ===
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

def start_http_server():
    try:
        with socketserver.TCPServer(("", HTTP_PORT), Handler) as httpd:
            print(f"🌐 Servidor web activo en http://localhost:{HTTP_PORT}")
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
        connected_clients.remove(websocket)
        print("❌ Cliente WebSocket desconectado")

async def start_ws():
    async with websockets.serve(handle_ws, "localhost", WS_PORT):
        print(f"📡 WebSocket activo en ws://localhost:{WS_PORT}")
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
        # Iniciar comunicación serial
        serial.connect()
        serial.add_callback(on_serial_data)
        serial.start_listening()

        # Guardamos el event loop PRINCIPAL antes de lanzarlo
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Servidor web en segundo hilo
        threading.Thread(target=start_http_server, daemon=True).start()

        # Servidor WebSocket en el loop principal
        loop.run_until_complete(start_ws())

    except Exception as e:
        print(f"❌ Error al iniciar sistema: {e}")