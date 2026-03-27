import asyncio
import threading
import http.server
import socketserver
import os
import sys
import signal
import json
import webbrowser
from urllib.parse import urlparse
from bridge.serial_manager import SerialManager
from bridge.serial_port_dialog import prompt_for_serial_port
import websockets

if os.name == "nt":
    import msvcrt
else:
    msvcrt = None

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
async_shutdown_event = None
http_server = None
http_thread = None
shutdown_event = threading.Event()


class StartupCancelled(Exception):
    pass


def request_shutdown(reason=None):
    global http_server

    first_request = not shutdown_event.is_set()
    if first_request and reason:
        print(f"[INFO] {reason}")

    shutdown_event.set()

    if http_server is not None:
        try:
            http_server.shutdown()
        except Exception:
            pass

    if loop is not None and async_shutdown_event is not None:
        try:
            loop.call_soon_threadsafe(async_shutdown_event.set)
        except Exception:
            pass


def install_signal_handlers():
    def on_signal(signum, _frame):
        request_shutdown(f"Cierre solicitado por señal {signum}.")

    signal_names = ("SIGINT", "SIGTERM", "SIGBREAK", "SIGHUP")
    for signal_name in signal_names:
        signal_number = getattr(signal, signal_name, None)
        if signal_number is None:
            continue
        try:
            signal.signal(signal_number, on_signal)
        except Exception:
            pass


def pause_before_exit():
    if os.name != "nt" or not getattr(sys, "frozen", False):
        return

    print()
    print("Presione cualquier tecla para cerrar...")
    try:
        if msvcrt is not None:
            msvcrt.getch()
    except Exception:
        pass


def report_startup_error(error):
    message = str(error)
    if message == "Arduino no encontrado":
        print("[ERROR] El viscosimetro no esta conectado al computador.")
        print("[INFO] Conecte el equipo por USB y vuelva a intentarlo.")
    elif message == "Inicio cancelado por el usuario":
        print("[INFO] Inicio cancelado por el usuario.")
    else:
        print(f"[ERROR] Error al iniciar sistema: {message}")


def connect_serial_with_dialog():
    try:
        serial.connect()
        return
    except Exception as initial_error:
        if ALLOW_NO_DEVICE:
            print(
                "[WARN] Arduino no encontrado. Continuando en modo desarrollo "
                f"sin dispositivo porque VISC_ALLOW_NO_DEVICE=1 ({initial_error})."
            )
            return

        last_error = initial_error
        while True:
            selected_port = prompt_for_serial_port(
                load_ports=serial.list_available_ports,
                error_message=str(last_error),
            )
            if not selected_port:
                raise StartupCancelled("Inicio cancelado por el usuario")

            try:
                serial.connect(port=selected_port)
                return
            except Exception as connect_error:
                last_error = connect_error

# === Servidor Web ===
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def _is_shutdown_route(self):
        return urlparse(self.path).path == "/api/shutdown"

    def _set_cors_headers(self):
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status_code)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self._is_shutdown_route():
            self.send_response(204)
            self._set_cors_headers()
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "600")
            self.end_headers()
            return
        self.send_error(404, "Not Found")

    def do_POST(self):
        if not self._is_shutdown_route():
            self.send_error(404, "Not Found")
            return

        threading.Thread(
            target=request_shutdown,
            args=("Cierre solicitado desde la interfaz web.",),
            daemon=True,
        ).start()
        self._send_json(200, {"ok": True, "message": "shutdown_requested"})


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def start_http_server():
    global http_server
    try:
        with ReusableTCPServer((HTTP_HOST, HTTP_PORT), Handler) as httpd:
            http_server = httpd
            print(f"[HTTP] Servidor web activo en http://localhost:{HTTP_PORT}")
            if OPEN_BROWSER:
                webbrowser.open(f"http://localhost:{HTTP_PORT}")
            httpd.serve_forever(poll_interval=0.5)
    except OSError as error:
        print(f"[WARN] Puerto {HTTP_PORT} ya esta en uso. Cierra la otra app o cambia el puerto.")
        request_shutdown(f"No se pudo iniciar HTTP ({error}).")
    finally:
        http_server = None

# === Manejo WebSocket ===
async def handle_ws(websocket):
    print("[WS] Cliente WebSocket conectado")
    connected_clients.add(websocket)

    try:
        await websocket.wait_closed()
    finally:
        connected_clients.discard(websocket)
        print("[WS] Cliente WebSocket desconectado")

async def start_ws():
    async with websockets.serve(handle_ws, WS_HOST, WS_PORT):
        print(f"[WS] WebSocket activo en ws://{WS_HOST or 'localhost'}:{WS_PORT}")
        if async_shutdown_event is None:
            await asyncio.Future()  # Mantener servidor corriendo
        await async_shutdown_event.wait()


async def close_ws_clients():
    if not connected_clients:
        return
    await asyncio.gather(
        *(websocket.close() for websocket in list(connected_clients)),
        return_exceptions=True,
    )

# === Callback para cuando llegan datos del Arduino ===
def on_serial_data(data):
    if isinstance(data, dict):
        raw_line = str(data.get("raw", "")).strip()
        telemetry_payload = data.get("telemetry")
        if isinstance(telemetry_payload, dict):
            print(
                "[SerialManager] Recibido RAW: "
                f"{raw_line} | Calculado: {json.dumps(telemetry_payload, ensure_ascii=True)}"
            )
        else:
            print(f"[SerialManager] Recibido RAW: {raw_line}")
        outgoing_message = json.dumps(data, ensure_ascii=True)
    else:
        outgoing_message = str(data)
        print(f"[SerialManager] Recibido: {outgoing_message}")

    # Enviar a todos los clientes WebSocket conectados
    for ws in list(connected_clients):
        try:
            asyncio.run_coroutine_threadsafe(ws.send(outgoing_message), loop)
        except Exception as e:
            print(f"[WS Error] {e}")

# === Main ===
if __name__ == "__main__":
    try:
        install_signal_handlers()

        if not os.path.isdir(FRONTEND_DIR):
            raise FileNotFoundError(
                f"Frontend no encontrado en '{FRONTEND_DIR}'. Ejecuta el build de ui-viscosimetro."
            )

        # Iniciar comunicación serial
        connect_serial_with_dialog()
        if serial.serial and serial.serial.is_open:
            serial.add_callback(on_serial_data)
            serial.start_listening()

        # Guardamos el event loop PRINCIPAL antes de lanzarlo
        async_shutdown_event = asyncio.Event()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Servidor web en segundo hilo
        http_thread = threading.Thread(target=start_http_server, daemon=True)
        http_thread.start()

        # Servidor WebSocket en el loop principal
        loop.run_until_complete(start_ws())

    except KeyboardInterrupt:
        print("\n[INFO] Cierre solicitado por usuario.")
        request_shutdown()
    except StartupCancelled as e:
        report_startup_error(e)
        request_shutdown()
    except Exception as e:
        report_startup_error(e)
        pause_before_exit()
        request_shutdown()
    finally:
        request_shutdown()

        try:
            if loop is not None and not loop.is_closed():
                loop.run_until_complete(close_ws_clients())
                loop.run_until_complete(loop.shutdown_asyncgens())
                loop.close()
        except Exception:
            pass

        if http_thread is not None and http_thread.is_alive():
            try:
                http_thread.join(timeout=2)
            except Exception:
                pass

        try:
            serial.close()
        except Exception:
            pass
