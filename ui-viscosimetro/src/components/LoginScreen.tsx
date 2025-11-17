import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "../styles/login-screen.css";

interface LoginScreenProps {
  onLogin: (success: boolean, userData?: { username: string; role: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const validUsers = [
      { username: "admin", password: "admin", role: "Administrador" },
      { username: "operator1", password: "op123", role: "Operador" },
      { username: "analyst", password: "an123", role: "Analista" },
    ];

    const user = validUsers.find(
      (u) => u.username === username && u.password === password,
    );

    if (user) {
      onLogin(true, { username: user.username, role: user.role });
    } else {
      setError("Usuario o contraseña incorrectos");
      onLogin(false);
    }

    setIsLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="login-tag">Acceso</span>
        <div className="login-grid">
          <div className="login-form-column">
            <div className="login-heading">
              <h1 className="login-title">Bienvenido a Phynovo</h1>
              <p className="login-subtitle">
                Ingresa tus credenciales para administrar dispositivos, extraer datos históricos y gestionar la configuración del sistema.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="username" className="login-label">
                  Usuario
                </label>
                <div className="login-input-wrapper">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresar usuario"
                    className="login-input"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password" className="login-label">
                  Contraseña
                </label>
                <div className="login-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresar contraseña"
                    className="login-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-toggle"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </form>

            <div className="login-credentials">
              <p className="login-credentials-title">Credenciales de demostración</p>
              <ul className="login-credentials-list">
                <li>
                  <span>
                    Administrador: <span className="login-credentials-code">admin / admin</span>
                  </span>
                </li>
                <li>
                  <span>
                    Operador: <span className="login-credentials-code">operator1 / op123</span>
                  </span>
                </li>
                <li>
                  <span>
                    Analista: <span className="login-credentials-code">analyst / an123</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <aside className="login-brand-card">
            <div className="login-brand-icon">
              <div className="login-brand-dot" />
            </div>
            <h2 className="login-brand-title">PHYNOVO</h2>
            <p className="login-brand-subtitle">Quick-Visc System</p>
            <p className="login-brand-caption">Viscometer Control Interface</p>
          </aside>
        </div>

        <div className="login-footer">
          Phynovo SPA © 2025 – Sistema de Control Quick-Visc v2.1.4
        </div>
      </div>
    </div>
  );
}
