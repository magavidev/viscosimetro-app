import asyncio
import websockets
import serial
import serial.tools.list_ports
import os
import http.server
import socketserver
import threading
import webbrowser

# === CONFIG ===
HTTP_PORT = 8780
WS_PORT = 8781
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'ui-viscosimetro', 'dist')

# === Serial Manager ===
class SerialManager:
    def __init__(self, baudrate=9600):
        self.baudrate = baudrate
        self.port = None
        self.serial_conn = None

    def connect(self):
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if "Arduino" in port.description or "usbmodem" in port.device:
                self.port = port.device
                break
        if not self.port:
            raise Exception("Arduino no encontrado")

        self.serial_conn = serial.Serial(self.port, self.baudrate)
        print(f"✅ Conectado a {self.port}")

    def read_line(self):
        if self.serial_conn and self.serial_conn.in_waiting:
            return self.serial_conn.readline().decode('utf-8').strip()
        return None

# === Servidor Web para mostrar frontend compilado ===
class FrontendHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

def start_http_server():
    try:
        with socketserver.TCPServer(("", HTTP_PORT), FrontendHandler) as httpd:
            print(f"🌐 Servidor web activo en http://localhost:{HTTP_PORT}")
            webbrowser.open(f"http://localhost:{HTTP_PORT}")
            httpd.serve_forever()
    except OSError:
        print(f"⚠️ Puerto {HTTP_PORT} en uso. Asegúrate de que no esté abierto en otra app.")

# === WebSocket para enviar datos en tiempo real ===
serial_manager = SerialManager()

async def handle_connection(websocket):
    print("🔌 Cliente WebSocket conectado")
    try:
        while True:
            data = serial_manager.read_line()
            if data:
                await websocket.send(data)
            await asyncio.sleep(0.1)
    except websockets.exceptions.ConnectionClosed:
        print("❌ Cliente WebSocket desconectado")

async def main():
    serial_manager.connect()

    # Levantar el servidor web en segundo plano
    threading.Thread(target=start_http_server, daemon=True).start()

    # Iniciar el WebSocket
    async with websockets.serve(handle_connection, "localhost", WS_PORT):
        print(f"📡 WebSocket activo en ws://localhost:{WS_PORT}")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())