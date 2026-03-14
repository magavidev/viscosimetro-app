import serial
import serial.tools.list_ports
import threading
from dataclasses import dataclass


@dataclass(frozen=True)
class SerialPortOption:
    device: str
    description: str
    manufacturer: str
    hwid: str
    preferred: bool = False


class SerialManager:
    def __init__(self, baudrate=9600):
        self.port = None
        self.baudrate = baudrate
        self.serial = None
        self.is_listening = False
        self.read_thread = None
        self.callbacks = []

    def _is_preferred_port(self, port_info):
        port_text = " ".join(
            filter(
                None,
                [
                    port_info.device,
                    port_info.description,
                    getattr(port_info, "manufacturer", None),
                    getattr(port_info, "hwid", None),
                ],
            )
        ).lower()
        markers = (
            "arduino",
            "ttyacm",
            "usbmodem",
            "wchusbserial",
            "ch340",
            "cp210",
            "silicon labs",
            "usb serial",
        )
        return any(marker in port_text for marker in markers)

    def list_available_ports(self):
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append(
                SerialPortOption(
                    device=port.device,
                    description=port.description or "Sin descripcion",
                    manufacturer=getattr(port, "manufacturer", None) or "",
                    hwid=getattr(port, "hwid", None) or "",
                    preferred=self._is_preferred_port(port),
                )
            )
        return sorted(ports, key=lambda item: (not item.preferred, item.device))

    def find_arduino_port(self):
        for port in self.list_available_ports():
            if port.preferred:
                return port.device
        return None

    def connect(self, port=None):
        target_port = port or self.find_arduino_port()
        if not target_port:
            raise Exception("Arduino no encontrado")

        self.port = target_port
        try:
            self.serial = serial.Serial(self.port, self.baudrate, timeout=1)
        except serial.SerialException as error:
            self.port = None
            self.serial = None
            raise Exception(f"No se pudo abrir el puerto {target_port}: {error}") from error
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
