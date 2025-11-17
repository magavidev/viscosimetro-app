import  { useEffect, useRef, useState } from "react";

interface DeviceStatusProps {
  isMeasuring: boolean;
  onMeasure: () => void;
  onReset: () => void;
  connectionStatus: "connected" | "disconnected" | "error";
  lastUpdate: Date;
  measurementCount: number;
}

const statusCopy: Record<DeviceStatusProps["connectionStatus"], string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  error: "Con incidencias",
};

export function DeviceStatus({
  isMeasuring,
  onMeasure,
  onReset,
}: DeviceStatusProps) {
  const [localStatus, setLocalStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [count, setCount] = useState(0);
  const [last, setLast] = useState(new Date());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8781");
    wsRef.current = ws;

    ws.onopen = () => {
      setLocalStatus("connected");
      console.log("✅ WebSocket conectado");
    };

    ws.onmessage = (event) => {
      console.log("📨 Datos recibidos:", event.data);

      // ejemplo: "VIS:2.31;TEMP:23.4"
      const now = new Date();
      setLast(now);
      setCount((prev) => prev + 1);

      // si necesitas levantar alguna función:
      // onMeasure(); // si se requiere actualizar el estado superior
    };

    ws.onerror = () => {
      setLocalStatus("error");
    };

    ws.onclose = () => {
      setLocalStatus("disconnected");
      console.log("❌ WebSocket desconectado");
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <section className="device-control-card">
      <span className={`badge-status ${localStatus === "error" ? "error" : ""}`}>
        {statusCopy[localStatus]}
      </span>

      <div className="device-control-actions">
        <button
          type="button"
          className="control-button primary"
          onClick={onMeasure}
          disabled={isMeasuring || localStatus !== "connected"}
        >
          {isMeasuring ? "Generando lectura..." : "Iniciar medición"}
        </button>
        <button
          type="button"
          className="control-button outline"
          onClick={onReset}
          disabled={isMeasuring}
        >
          Reiniciar sesión
        </button>
      </div>

      <div className="device-control-meta">
        <span>Lecturas acumuladas: <strong>{count}</strong></span>
        <span>
          Última actualización: {last.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
    </section>
  );
}