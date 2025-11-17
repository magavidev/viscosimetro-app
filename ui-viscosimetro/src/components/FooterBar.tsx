import "../styles/status-footer.css";

interface FooterBarProps {
  deviceModel?: string;
  serialNumber?: string;
  firmwareVersion?: string;
}

export function FooterBar({
  deviceModel = "Quick-Visc 1.0",
  serialNumber = "QV000-001",
  firmwareVersion = "v2.1.4",
}: FooterBarProps) {
  return (
    <div className="footer-wrap">
      <div className="footer-bar">
        <div className="footer-device-meta">
          <span>Phynovo SPA</span>
          <span>
            {deviceModel} • {firmwareVersion} • S/N: {serialNumber}
          </span>
        </div>
        <a className="footer-support" href="mailto:soporte@phynovo.com">
          <span>Soporte Técnico</span>
        </a>
      </div>
    </div>
  );
}
