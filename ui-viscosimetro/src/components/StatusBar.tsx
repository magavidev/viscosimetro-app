import { useState } from "react";
import { User, LogOut, ChevronDown, Power } from "lucide-react";
import "../styles/status-footer.css";

interface StatusBarProps {
  connectionStatus: "connected" | "disconnected" | "error";
  deviceModel?: string;
  serialNumber?: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  onShutdownApp?: () => void;
  isShuttingDown?: boolean;
}

const statusCopy: Record<StatusBarProps["connectionStatus"], string> = {
  connected: "Dispositivo Conectado",
  disconnected: "Dispositivo Desconectado",
  error: "Error de Conexión",
};

export function StatusBar({
  connectionStatus,
  deviceModel = "Quick-Visc 1.0",
  serialNumber = "QV000-001",
  userName = "admin",
  userRole = "Administrador",
  onLogout,
  onShutdownApp,
  isShuttingDown = false,
}: StatusBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="status-bar-wrap">
      <div className="status-bar">
        <div className="status-meta">
          <span className="status-pill">
            <span className={`status-indicator ${connectionStatus}`} />
            {statusCopy[connectionStatus]}
          </span>
          <span>
            {deviceModel} • S/N: {serialNumber}
          </span>
        </div>

        <div className="status-user">
          <button
            type="button"
            className="status-user-button"
            onClick={() => setOpen((prev) => !prev)}
          >
            <div className="status-user-meta">
              <span className="status-user-name">{userName}</span>
              <span className="status-user-role">{userRole}</span>
            </div>
            <div className="status-avatar">
              <User size={16} />
            </div>
            <ChevronDown size={16} className={`status-caret ${open ? "open" : ""}`} />
          </button>

          {open && (
            <div className="status-dropdown">
              <div className="status-dropdown-header">
                <span className="status-dropdown-name">{userName}</span>
                <span className="status-dropdown-role">{userRole}</span>
              </div>
              <button
                type="button"
                className="status-dropdown-action shutdown"
                onClick={() => {
                  setOpen(false);
                  onShutdownApp?.();
                }}
                disabled={isShuttingDown}
              >
                <Power size={16} />
                {isShuttingDown ? "Cerrando aplicación..." : "Cerrar aplicación"}
              </button>
              <button
                type="button"
                className="status-dropdown-action"
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}

          {open && (<div style={{ position: "fixed", inset: 0 }} onClick={() => setOpen(false)} />)}
        </div>
      </div>
    </div>
  );
}
