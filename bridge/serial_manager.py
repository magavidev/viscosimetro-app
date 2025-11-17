import serial
import serial.tools.list_ports
import threading

class SerialManager:
    def __init__(self, baudrate=9600):
        self.port = None
        self.baudrate = baudrate
        self.serial = None
        self.is_listening = False
        self.read_thread = None
        self.callbacks = []

    def find_arduino_port(self):
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if "Arduino" in port.description or "ttyACM" in port.device or "usbmodem" in port.device:
                return port.device
        return None

    def connect(self):
        self.port = self.find_arduino_port()
        if not self.port:
            raise Exception("Arduino no encontrado")

        self.serial = serial.Serial(self.port, self.baudrate, timeout=1)
        print(f"[SerialManager] Conectado a {self.port}")

    def start_listening(self):
        if not self.serial or not self.serial.is_open:
            raise Exception("Puerto serial no abierto")

        self.is_listening = True
        self.read_thread = threading.Thread(target=self._read_loop, daemon=True)
        self.read_thread.start()
        print("[SerialManager] Escuchando datos del Arduino...")

    def _read_loop(self):
        while self.is_listening:
            try:
                if self.serial.in_waiting:
                    line = self.serial.readline().decode("utf-8", errors="ignore").strip()
                    if line:
                        for callback in self.callbacks:
                            callback(line)
            except Exception as e:
                print(f"[SerialManager] Error de lectura: {e}")

    def stop_listening(self):
        self.is_listening = False
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join()

    def send_command(self, command: str):
        if self.serial and self.serial.is_open:
            self.serial.write((command + '\n').encode())
            print(f"[SerialManager] Comando enviado: {command}")

    def add_callback(self, callback_fn):
        self.callbacks.append(callback_fn)

    def close(self):
        self.stop_listening()
        if self.serial and self.serial.is_open:
            self.serial.close()
            print("[SerialManager] Puerto cerrado")