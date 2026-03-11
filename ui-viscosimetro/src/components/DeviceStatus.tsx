import type { ConnectionStatus } from "../types/measurement";

interface DeviceStatusProps {
  isMeasuring: boolean;
  onMeasure: () => void;
  onReset: () => void;
  connectionStatus: ConnectionStatus;
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
  connectionStatus,
  lastUpdate,
  measurementCount,
}: DeviceStatusProps) {
  return (
    <section className="device-control-card">
      <span className={`badge-status ${connectionStatus === "error" ? "error" : ""}`}>
        {statusCopy[connectionStatus]}
      </span>

      <div className="device-control-actions">
        <button
          type="button"
          className="control-button primary"
          onClick={onMeasure}
          disabled={isMeasuring || connectionStatus !== "connected"}
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
        <span>Lecturas acumuladas: <strong>{measurementCount}</strong></span>
        <span>
          Última actualización:{" "}
          {lastUpdate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>
    </section>
  );
}
