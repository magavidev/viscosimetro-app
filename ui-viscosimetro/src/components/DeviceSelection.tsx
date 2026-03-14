import { Activity, Gauge, Beaker } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { FooterBar } from "./FooterBar";
import { UserManagement } from "./UserManagement";
import "../styles/device-selection.css";

interface DeviceSelectionProps {
  onDeviceSelect: (device: "Q-VISC" | "Q-DENS") => void;
  currentUser?: {
    username: string;
    role: string;
  } | null;
  onLogout?: () => void;
  onShutdownApp?: () => void;
  isShuttingDown?: boolean;
}

export function DeviceSelection({
  onDeviceSelect,
  currentUser,
  onLogout,
  onShutdownApp,
  isShuttingDown = false,
}: DeviceSelectionProps) {
  const userSubtitle =
    currentUser?.role === "Administrador"
      ? "Administre usuarios del sistema y configure contraseñas"
      : "Configure sus preferencias de usuario y contraseña";

  return (
    <div className="device-selection-screen">
      <div className="status-shell">
        <StatusBar
          connectionStatus="disconnected"
          userName={currentUser?.username}
          userRole={currentUser?.role}
          deviceModel="Esperando selección..."
          serialNumber="--"
          onLogout={onLogout}
          onShutdownApp={onShutdownApp}
          isShuttingDown={isShuttingDown}
        />
      </div>

      <div className="device-selection-wrapper">
        <div className="device-selection-container">
          <section className="device-selection-card">
            <div className="device-selection-header">
              <h1 className="device-selection-title">Selección de Dispositivo</h1>
              <p className="device-selection-subtitle">
                Seleccione el tipo de dispositivo con el que desea trabajar
              </p>
            </div>

            <div className="device-selection-grid">
              <button
                type="button"
                className="device-card"
                onClick={() => onDeviceSelect("Q-VISC")}
              >
                <div className="device-icon blue">
                  <Gauge className="h-10 w-10" />
                </div>
                <div>
                  <div className="device-card-title">Q-VISC</div>
                  <p className="device-card-description">
                    Viscosímetro para medición de viscosidad
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="device-card"
                onClick={() => onDeviceSelect("Q-DENS")}
              >
                <div className="device-icon green">
                  <Activity className="h-10 w-10" />
                </div>
                <div>
                  <div className="device-card-title">Q-DENS</div>
                  <p className="device-card-description">
                    Densímetro para medición de densidad
                  </p>
                </div>
              </button>

              <button type="button" className="device-card" disabled>
                <div className="device-icon orange">
                  <Beaker className="h-10 w-10" />
                </div>
                <div>
                  <div className="device-card-title">Q-Static</div>
                  <p className="device-card-description">Próximamente disponible</p>
                </div>
              </button>
            </div>

            <div className="device-selection-note">
              Ambos dispositivos utilizan la misma interfaz de control con terminología específica
            </div>
          </section>

          <section className="user-config-card">
            <div>
              <h2 className="user-config-title">Configuración de Usuario</h2>
              <p className="user-config-subtitle">{userSubtitle}</p>
            </div>
            <div className="user-config-action">
              <UserManagement currentUser={currentUser} />
            </div>
          </section>
        </div>
      </div>

      <div className="footer-shell">
        <FooterBar deviceModel="Esperando selección..." serialNumber="--" firmwareVersion="--" />
      </div>
    </div>
  );
}
