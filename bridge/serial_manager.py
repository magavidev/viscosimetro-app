import serial
import serial.tools.list_ports
import threading
import json
import math
import os
import re
import time
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
        self.probe_timeout = self._load_probe_timeout()
        self.probe_non_preferred_only = (
            os.getenv("VISC_SERIAL_PROBE_NON_PREFERRED_ONLY", "0").lower()
            in {"1", "true", "yes"}
        )
        self.probe_require_data = (
            os.getenv("VISC_SERIAL_PROBE_REQUIRE_DATA", "0").lower()
            in {"1", "true", "yes"}
        )
        self.probe_reject_invalid = (
            os.getenv("VISC_SERIAL_PROBE_REJECT_INVALID", "0").lower()
            in {"1", "true", "yes"}
        )

    def _load_probe_timeout(self):
        raw_value = os.getenv("VISC_SERIAL_PROBE_TIMEOUT", "3.0")
        try:
            return max(float(raw_value), 0.0)
        except ValueError:
            return 3.0

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

    def _find_port_option(self, device):
        for port in self.list_available_ports():
            if port.device == device:
                return port
        return None

    def _parse_number(self, value):
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)):
            number = float(value)
            return number if math.isfinite(number) else None
        if isinstance(value, str):
            try:
                number = float(value.strip())
            except ValueError:
                return None
            return number if math.isfinite(number) else None
        return None

    def _pick_first_number(self, payload, keys):
        for key in keys:
            if key not in payload:
                continue
            parsed = self._parse_number(payload[key])
            if parsed is not None:
                return parsed
        return None

    def _looks_like_json_telemetry(self, raw_line):
        if not raw_line.startswith("{"):
            return False

        try:
            parsed = json.loads(raw_line)
        except json.JSONDecodeError:
            return False

        if not isinstance(parsed, dict):
            return False

        viscosity = self._pick_first_number(parsed, ["viscosity", "density", "vis", "dens"])
        temperature = self._pick_first_number(parsed, ["temperature", "temp"])
        return viscosity is not None and temperature is not None

    def _looks_like_delimited_telemetry(self, raw_line):
        viscosity = None
        temperature = None
        key_value_pairs = re.split(r"[;,]", raw_line)
        for pair in key_value_pairs:
            tokens = re.split(r"[:=]", pair, maxsplit=1)
            if len(tokens) != 2:
                continue

            key = tokens[0].strip().upper()
            value = self._parse_number(tokens[1].strip())
            if not key or value is None:
                continue

            if key in {"VIS", "VISC", "VISCOSITY", "DENS", "DENSITY"}:
                viscosity = value
                continue

            if key in {"TEMP", "TEMPERATURE", "T"}:
                temperature = value

        return viscosity is not None and temperature is not None

    def _looks_like_telemetry(self, raw_line):
        return (
            self._looks_like_json_telemetry(raw_line)
            or self._looks_like_delimited_telemetry(raw_line)
        )

    def _probe_serial_stream(self):
        """
        Devuelve:
        - "valid": se detecto al menos una linea de telemetria valida.
        - "invalid": llegaron lineas pero ninguna con formato esperado.
        - "no_data": no llego ninguna linea durante el timeout.
        - "skipped": no se puede/conviene hacer probe.
        """
        if not self.serial or not self.serial.is_open:
            return "skipped"

        if self.probe_timeout <= 0:
            return "skipped"

        try:
            self.serial.reset_input_buffer()
        except Exception:
            pass

        deadline = time.monotonic() + self.probe_timeout
        got_any_line = False
        while time.monotonic() < deadline:
            try:
                line = self.serial.readline().decode("utf-8", errors="ignore").strip()
            except Exception:
                return "invalid"

            if not line:
                continue
            got_any_line = True
            if self._looks_like_telemetry(line):
                return "valid"

        if got_any_line:
            return "invalid"
        return "no_data"

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
        was_manual_selection = port is not None
        target_port = port or self.find_arduino_port()
        if not target_port:
            raise Exception("Arduino no encontrado")

        self.port = target_port
        selected_option = self._find_port_option(target_port)
        try:
            self.serial = serial.Serial(self.port, self.baudrate, timeout=1)
        except serial.SerialException as error:
            self.port = None
            self.serial = None
            raise Exception(f"No se pudo abrir el puerto {target_port}: {error}") from error

        is_preferred_selected = selected_option is not None and selected_option.preferred
        if was_manual_selection and is_preferred_selected:
            print(
                f"[SerialManager] Puerto preferido seleccionado ({self.port}). "
                "Se omite validacion estricta inicial."
            )

        should_probe = was_manual_selection and (not is_preferred_selected) and (
            not self.probe_non_preferred_only
            or selected_option is None
            or not selected_option.preferred
        )
        if should_probe:
            print(
                f"[SerialManager] Validando telemetria en {self.port} "
                f"(timeout {self.probe_timeout:.1f}s)..."
            )
            probe_result = self._probe_serial_stream()
            reject_by_probe = (
                (probe_result == "invalid" and self.probe_reject_invalid)
                or (probe_result == "no_data" and self.probe_require_data)
            )
            if reject_by_probe:
                if self.serial and self.serial.is_open:
                    self.serial.close()
                self.serial = None
                self.port = None
                if probe_result == "no_data":
                    raise Exception(
                        "El puerto seleccionado no envio datos dentro del tiempo esperado."
                    )
                raise Exception(
                    f"El puerto {target_port} no entrega telemetria valida del viscosimetro."
                )
            if probe_result == "invalid":
                print(
                    "[SerialManager] Se recibieron datos iniciales con formato no reconocido. "
                    "Se continua con el puerto seleccionado."
                )
            if probe_result == "no_data":
                print(
                    "[SerialManager] No se detectaron datos durante la validacion inicial. "
                    "Se continua con el puerto seleccionado."
                )

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
