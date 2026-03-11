import { useState, useMemo } from "react";
import { MeasurementCard } from "./components/MeasurementCard";
import { DeviceStatus } from "./components/DeviceStatus";
import { ViscosityChart } from "./components/ViscosityChart";
import { TemperatureChart } from "./components/TemperatureChart";
import { StatusBar } from "./components/StatusBar";
import { FooterBar } from "./components/FooterBar";
import { LoginScreen } from "./components/LoginScreen";
import { DeviceSelection } from "./components/DeviceSelection";
import { useDeviceWebSocket } from "./hooks/useDeviceWebSocket";
import { useMeasurementSession } from "./hooks/useMeasurementSession";
import "./styles/landing.css";
import "./styles/dashboard.css";
import type { DeviceType } from "./types/measurement";
import {
  Thermometer,
  Gauge,
  TrendingUp,
  Settings,
  Target,
  Database,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    role: string;
  } | null>(null);
  
  // Device selection state
  const [selectedDevice, setSelectedDevice] = useState<DeviceType | null>(null);

  const [selectedFile, setSelectedFile] = useState<
    string | null
  >(null);
  const [simulatedData, setSimulatedData] = useState<
    { time: string; viscosity: number; temperature: number }[]
  >([]);
  const [results, setResults] = useState<{
    mean: number;
    std: number;
    tec: number;
  } | null>(null);
  const [view, setView] = useState<
    "landing" | "realtime" | "data" | "calibration" | "settings"
  >("landing");

  // Calibration-specific state
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<'success' | 'failure' | null>(null);
  const [hasEvaluated, setHasEvaluated] = useState(false);

  // Settings-specific state
  const [deviceSettings, setDeviceSettings] = useState({
    measurementTime: 3,
    autoSave: true,
    dataRetention: 30,
    temperatureUnit: 'celsius',
    language: 'spanish',
    networkMode: 'wifi'
  });

  const {
    isMeasuring,
    currentData,
    historicalData,
    measurementCount,
    hasWarnings,
    applyReading,
    startSimulatedMeasurement,
    resetSession,
    getViscosityStatus,
    getTemperatureStatus,
    getStdDevStatus,
    getTrend,
  } = useMeasurementSession(selectedDevice);

  const { connectionStatus } = useDeviceWebSocket({
    enabled: isAuthenticated && selectedDevice !== null,
    onReading: applyReading,
  });

  // Calibration functions
  const startEvaluation = () => {
    setShowPatternModal(true);
  };

  const handlePatternInserted = () => {
    setShowPatternModal(false);
    setIsEvaluating(true);
    
    // Simulate evaluation process (3 seconds)
    setTimeout(() => {
      // Random result for demonstration - 80% chance of success
      const success = Math.random() > 0.2;
      setEvaluationResult(success ? 'success' : 'failure');
      setIsEvaluating(false);
      setHasEvaluated(true);
    }, 3000);
  };

  const resetEvaluation = () => {
    setEvaluationResult(null);
    setHasEvaluated(false);
    setIsEvaluating(false);
    setShowPatternModal(false);
  };

  // Authentication functions  
  const handleLogin = (success: boolean, userData?: { username: string; role: string }) => {
    if (success && userData) {
      setIsAuthenticated(true);
      setCurrentUser(userData);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedDevice(null);
    setView("landing");
    resetSession();
    // Reset other states
    setSelectedFile(null);
    setSimulatedData([]);
    setResults(null);
    setShowPatternModal(false);
    setIsEvaluating(false);
    setEvaluationResult(null);
    setHasEvaluated(false);
  };

  // Device selection function
  const handleDeviceSelection = (device: DeviceType) => {
    setSelectedDevice(device);
  };

  // Get terminology based on selected device
  const terminology = useMemo(() => {
    if (selectedDevice === "Q-DENS") {
      return {
        measurement: "densidad",
        measurementCap: "Densidad",
        unit: "g/cm³",
        deviceName: "Densímetro",
        batchDescription: "Batch density measurement and monitoring",
      };
    }
    return {
      measurement: "viscosidad",
      measurementCap: "Viscosidad",
      unit: "cP",
      deviceName: "Viscosímetro",
      batchDescription: "Batch viscosity measurement and monitoring",
    };
  }, [selectedDevice]);

  const scheduleLabels = useMemo(() => {
    const today = new Date();
    const lastCalibration = new Date(today);
    lastCalibration.setMonth(today.getMonth() - 3);
    const nextCalibration = new Date(today);
    nextCalibration.setMonth(today.getMonth() + 3);
    const nextService = new Date(today);
    nextService.setMonth(today.getMonth() + 6);

    return {
      lastCalibration: formatDateLabel(lastCalibration),
      nextCalibration: formatDateLabel(nextCalibration),
      nextService: formatDateLabel(nextService),
    };
  }, []);

  // Prepare data for charts
  const viscosityData = historicalData.map((d) => ({
    time: d.time,
    viscosity: d.viscosity,
    standardDeviation: d.standardDeviation,
  }));

  const temperatureData = historicalData.map((d) => ({
    time: d.time,
    temperature: d.temperature,
  }));

  // ------------------ LOGIN SCREEN ------------------
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ------------------ DEVICE SELECTION SCREEN ------------------
  if (!selectedDevice) {
    return <DeviceSelection onDeviceSelect={handleDeviceSelection} currentUser={currentUser} onLogout={handleLogout} />;
  }

  // ------------------ LANDING PAGE ------------------
  if (view === "landing") {
    return (
      <div className="landing-page">
        <StatusBar
          connectionStatus={connectionStatus}
          userName={currentUser?.username}
          userRole={currentUser?.role}
          onLogout={handleLogout}
        />
        <main className="landing-main">
          <section className="landing-hero">
            <h1 className="landing-title">Phynovo</h1>
            <p className="landing-subtitle">Seleccione una opción para continuar</p>
          </section>

          <div className="landing-grid">
            <button type="button" className="landing-card" onClick={() => setView("realtime")}>
              <div className="landing-card-icon gray">
                <Zap className="h-6 w-6" />
              </div>
              <div className="landing-card-body">
                <span className="landing-card-title">Medición</span>
                <span className="landing-card-description">
                  Realizar mediciones de {terminology.measurement} en tiempo real y monitorear parámetros del dispositivo.
                </span>
              </div>
            </button>

            <button type="button" className="landing-card" onClick={() => setView("data")}>
              <div className="landing-card-icon blue">
                <Database className="h-6 w-6" />
              </div>
              <div className="landing-card-body">
                <span className="landing-card-title">Datos de Memoria</span>
                <span className="landing-card-description">
                  Extraer y analizar datos almacenados en la memoria SSD del dispositivo.
                </span>
              </div>
            </button>

            <button type="button" className="landing-card" onClick={() => setView("calibration")}>
              <div className="landing-card-icon green">
                <Target className="h-6 w-6" />
              </div>
              <div className="landing-card-body">
                <span className="landing-card-title">Calibración</span>
                <span className="landing-card-description">
                  Calibrar el dispositivo usando estándares de referencia para garantizar precisión.
                </span>
              </div>
            </button>

            <button type="button" className="landing-card" onClick={() => setView("settings")}>
              <div className="landing-card-icon orange">
                <Settings className="h-6 w-6" />
              </div>
              <div className="landing-card-body">
                <span className="landing-card-title">Configuración</span>
                <span className="landing-card-description">
                  Configurar parámetros del sistema, conectividad y preferencias del usuario.
                </span>
              </div>
            </button>
          </div>
        </main>
        <FooterBar />
      </div>
    );
  }

  // ------------------ CALIBRATION VIEW ------------------
  if (view === "calibration") {
    return (
      <div className="page-shell">
        <StatusBar
          connectionStatus={connectionStatus}
          userName={currentUser?.username}
          userRole={currentUser?.role}
          onLogout={handleLogout}
        />
        <main className="page-main">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Evaluación del dispositivo</h1>
              <p className="page-subtitle">
                Verificar el funcionamiento del {terminology.deviceName.toLowerCase()}
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setView("landing")}>
              Volver al inicio
            </button>
          </header>

          <div className="panel-grid panel-grid--split">
            <section className="panel">
              <div className="evaluation-container">
                {!hasEvaluated && !isEvaluating && (
                  <div className="evaluation-callout">
                    <p>Inserte el patrón de referencia y ejecute la comprobación automática del {terminology.deviceName.toLowerCase()}.</p>
                    <button type="button" className="btn-primary" onClick={startEvaluation}>
                      Iniciar evaluación
                    </button>
                  </div>
                )}

                {isEvaluating && (
                  <div className="evaluation-callout">
                    <strong>Evaluando dispositivo...</strong>
                    <p>Por favor espere mientras se completa la evaluación automática.</p>
                  </div>
                )}

                {evaluationResult === "success" && (
                  <div className="evaluation-result success">
                    <CheckCircle size={24} />
                    <div>
                      <p className="page-subtitle" style={{ color: "inherit" }}>
                        Todas las pruebas han sido exitosas. El equipo está listo para operar.
                      </p>
                      <button type="button" className="btn-outline" onClick={resetEvaluation}>
                        Realizar nueva evaluación
                      </button>
                    </div>
                  </div>
                )}

                {evaluationResult === "failure" && (
                  <div className="evaluation-result error">
                    <XCircle size={24} />
                    <div>
                      <p className="page-subtitle" style={{ color: "inherit" }}>
                        Se detectaron incidencias. Revise el instrumento y contacte al soporte técnico.
                      </p>
                      <div className="action-row">
                        <button type="button" className="btn-outline" onClick={resetEvaluation}>
                          Reintentar evaluación
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => alert("Contactando con soporte técnico...")}
                        >
                          Contactar soporte
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!isEvaluating && (
                  <div className="action-row">
                    <button type="button" className="btn-ghost" onClick={() => setShowPatternModal(true)}>
                      Insertar patrón de evaluación
                    </button>
                    {hasEvaluated && (
                      <button type="button" className="btn-outline" onClick={resetEvaluation}>
                        Restablecer estado
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            <aside className="stack">
              <div className="info-card">
                <h3>Estado actual</h3>
                <div className="info-row">
                  <span>Última evaluación</span>
                  <strong>{hasEvaluated ? new Date().toLocaleDateString() : "Sin registros"}</strong>
                </div>
                <div className="info-row">
                  <span>Estado</span>
                  <strong>
                    {evaluationResult === "success"
                      ? "Operativo"
                      : evaluationResult === "failure"
                      ? "Con incidencias"
                      : "Pendiente"}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Última calibración</span>
                  <strong>{scheduleLabels.lastCalibration}</strong>
                </div>
                <div className="info-row">
                  <span>Próxima calibración</span>
                  <strong>{scheduleLabels.nextCalibration}</strong>
                </div>
              </div>

              <div className="info-card">
                <h3>Protocolos ejecutados</h3>
                <div className="protocol-list">
                  <span className="protocol-item">
                    <span className="protocol-dot" /> Verificación de sensores
                  </span>
                  <span className="protocol-item">
                    <span className="protocol-dot" /> Prueba de conectividad
                  </span>
                  <span className="protocol-item">
                    <span className="protocol-dot" /> Validación térmica
                  </span>
                  <span className="protocol-item">
                    <span className="protocol-dot" /> Integridad de memoria
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </main>
        <FooterBar />

        {showPatternModal && (
          <div className="modal-backdrop" onClick={() => setShowPatternModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="page-title" style={{ fontSize: "1.4rem" }}>
                Insertar patrón de evaluación
              </h3>
              <p className="page-subtitle">
                Inserte el patrón requerido ({selectedDevice === "Q-DENS" ? "1.000 g/cm³" : "100 cP"}) antes de continuar.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowPatternModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary" onClick={handlePatternInserted}>
                  Continuar evaluación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // ------------------ SETTINGS VIEW ------------------
  if (view === "settings") {
    return (
      <div className="page-shell">
        <StatusBar
          connectionStatus={connectionStatus}
          userName={currentUser?.username}
          userRole={currentUser?.role}
          onLogout={handleLogout}
        />
        <main className="page-main">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Configuración del sistema</h1>
              <p className="page-subtitle">Personaliza parámetros del dispositivo y preferencias de uso.</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setView("landing")}>
              Volver al inicio
            </button>
          </header>

          <div className="form-grid">
            <section className="form-card">
              <h3>Parámetros de medición</h3>
              <div className="form-field">
                <label>Tiempo de medición (segundos)</label>
                <input
                  type="number"
                  value={deviceSettings.measurementTime}
                  onChange={(e) => setDeviceSettings((prev) => ({ ...prev, measurementTime: parseInt(e.target.value, 10) }))}
                  min={1}
                  max={10}
                />
              </div>
              <div className="form-field">
                <label>Retención de datos (días)</label>
                <input
                  type="number"
                  value={deviceSettings.dataRetention}
                  onChange={(e) => setDeviceSettings((prev) => ({ ...prev, dataRetention: parseInt(e.target.value, 10) }))}
                  min={7}
                  max={365}
                />
              </div>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={deviceSettings.autoSave}
                  onChange={(e) => setDeviceSettings((prev) => ({ ...prev, autoSave: e.target.checked }))}
                />
                Guardado automático
              </label>
            </section>

            <section className="form-card">
              <h3>Preferencias de usuario</h3>
              <div className="form-field">
                <label>Unidad de temperatura</label>
                <select
                  value={deviceSettings.temperatureUnit}
                  onChange={(e) => setDeviceSettings((prev) => ({ ...prev, temperatureUnit: e.target.value }))}
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Idioma</label>
                <select
                  value={deviceSettings.language}
                  onChange={(e) => setDeviceSettings((prev) => ({ ...prev, language: e.target.value }))}
                >
                  <option value="spanish">Español</option>
                  <option value="english">English</option>
                </select>
              </div>
            </section>

            <section className="form-card">
              <h3>Información del sistema</h3>
              <div className="info-row">
                <span>Versión de firmware</span>
                <strong>v2.1.4</strong>
              </div>
              <div className="info-row">
                <span>Modelo</span>
                <strong>Quick-Visc 1.0</strong>
              </div>
              <div className="info-row">
                <span>Número de serie</span>
                <strong>QV000-001</strong>
              </div>
              <div className="info-row">
                <span>Espacio SSD</span>
                <strong>45.2 GB libres / 64 GB</strong>
              </div>
              <button type="button" className="btn-primary" style={{ width: "fit-content" }}>
                Actualizar firmware
              </button>
            </section>

            <section className="form-card">
              <h3>Acciones del sistema</h3>
              <div className="system-actions">
                <button type="button">Exportar configuración</button>
                <button type="button">Importar configuración</button>
                <button type="button" onClick={() => alert("Restaurando configuración predeterminada...")}>
                  Restablecer a valores por defecto
                </button>
              </div>
            </section>
          </div>
        </main>
        <FooterBar />
      </div>
    );
  }
  // ------------------ DATA VIEW ------------------
  if (view === "data") {
    const simulatedSSD = [
      { id: 1, name: "batch_001.csv", size: "4.5 KB" },
      { id: 2, name: "batch_002.csv", size: "4.2 KB" },
      { id: 3, name: "batch_003.csv", size: "4.9 KB" },
    ];

    const simulateFileProcessing = () => {
      const isQDENS = selectedDevice === 'Q-DENS';
      const data = Array.from({ length: 15 }, (_, i) => ({
        time: new Date(
          Date.now() - (15 - i) * 1000,
        ).toLocaleTimeString(),
        viscosity: isQDENS 
          ? Number((0.9 + Math.random() * 0.2).toFixed(3))
          : Number((110 + Math.random() * 20).toFixed(2)),
        temperature: Number((22 + Math.random() * 4).toFixed(2)),
      }));

      setSimulatedData(data);

      const measurements = data.map((d) => d.viscosity);
      const n = measurements.length;

      if (n === 0) {
        setResults({ mean: 0, std: 0, tec: 0 });
        return;
      }

      const mean = measurements.reduce((acc, v) => acc + v, 0) / n;
      const variance = n > 1
        ? measurements.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
        : 0;
      const std = Math.sqrt(variance);
      const tec = n > 0 ? std / Math.sqrt(n) : 0;

      setResults({
        mean: Number(mean.toFixed(isQDENS ? 3 : 2)),
        std: Number(std.toFixed(isQDENS ? 4 : 2)),
        tec: Number(tec.toFixed(isQDENS ? 4 : 2)),
      });
    };

    return (
      <div className="page-shell">
        <StatusBar
          connectionStatus={connectionStatus}
          userName={currentUser?.username}
          userRole={currentUser?.role}
          onLogout={handleLogout}
        />
        <main className="page-main">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Extracción de datos desde SSD - {selectedDevice}</h1>
              <p className="page-subtitle">
                Seleccione un archivo para procesar datos de {terminology.measurement}.
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setView("landing")}>
              Volver al inicio
            </button>
          </header>

          <div className="data-layout">
            <aside className="data-file-list">
              {simulatedSSD.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={`data-file-item ${selectedFile === file.name ? "active" : ""}`}
                  onClick={() => {
                    setSelectedFile(file.name);
                    setResults(null);
                    setSimulatedData([]);
                  }}
                >
                  {file.name} <span style={{ color: "#9ca1ba" }}>({file.size})</span>
                </button>
              ))}
            </aside>

            <section className="panel data-actions">
              <div className="action-row">
                <button type="button" className="btn-primary" onClick={simulateFileProcessing} disabled={!selectedFile}>
                  Calcular Media, σ y TEC
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={!selectedFile}
                  onClick={() => selectedFile && alert(`Descargando datos del archivo: ${selectedFile}`)}
                >
                  Descargar datos al computador
                </button>
              </div>

              {results && (
                <div className="data-result-card">
                  <span><strong>Archivo:</strong> {selectedFile}</span>
                  <span><strong>{terminology.measurementCap} media:</strong> {results.mean} {terminology.unit}</span>
                  <span><strong>Desviación estándar:</strong> {results.std} {terminology.unit}</span>
                  <span><strong>TEC:</strong> {results.tec} {terminology.unit}</span>
                </div>
              )}

              {!results && selectedFile && simulatedData.length === 0 && (
                <div className="data-result-card" style={{ background: "#ffffff" }}>
                  Inicie el procesamiento para visualizar estadísticas y gráficos comparativos.
                </div>
              )}

              {simulatedData.length > 0 && (
                <div className="chart-grid">
                  <div className="panel">
                    <ViscosityChart
                      data={simulatedData.map((d) => ({
                        time: d.time,
                        viscosity: d.viscosity,
                      }))}
                      title={`${terminology.measurementCap} (${terminology.unit}) vs Tiempo`}
                    />
                  </div>
                  <div className="panel">
                    <TemperatureChart
                      data={simulatedData.map((d) => ({
                        time: d.time,
                        temperature: d.temperature,
                      }))}
                      title="Temperatura (°C) vs Tiempo"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
        <FooterBar />
      </div>
    );
  }
  // ------------------ REALTIME VIEW ------------------
  return (
    <div className="page-shell">
      <StatusBar
        connectionStatus={connectionStatus}
        userName={currentUser?.username}
        userRole={currentUser?.role}
        onLogout={handleLogout}
      />
      <main className="page-main">
        <header className="page-header">
          <div className="page-heading">
            <h1 className="page-title">Phynovo Control Interface - {selectedDevice}</h1>
            <p className="page-subtitle">{terminology.batchDescription}</p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => setView("landing")}>
            Volver al inicio
          </button>
        </header>

        {hasWarnings && (
          <div className="panel panel--muted">
            Se detectaron lecturas fuera de rango. Revise los parámetros y confirme la estabilidad del proceso.
          </div>
        )}

        <section className="metric-grid">
          <MeasurementCard
            title={terminology.measurementCap}
            value={currentData.viscosity}
            unit={terminology.unit}
            status={getViscosityStatus(currentData.viscosity)}
            icon={<Gauge size={16} />}
            trend={getTrend("viscosity")}
          />

          <MeasurementCard
            title="Desviación estándar"
            value={currentData.standardDeviation}
            unit="σ"
            status={getStdDevStatus(currentData.standardDeviation)}
            icon={<TrendingUp size={16} />}
            trend={getTrend("standardDeviation")}
          />

          <MeasurementCard
            title="Temperatura"
            value={currentData.temperature}
            unit="°C"
            status={getTemperatureStatus(currentData.temperature)}
            icon={<Thermometer size={16} />}
            trend={getTrend("temperature")}
          />

          <DeviceStatus
            isMeasuring={isMeasuring}
            onMeasure={startSimulatedMeasurement}
            onReset={resetSession}
            connectionStatus={connectionStatus}
            lastUpdate={currentData.timestamp}
            measurementCount={measurementCount}
          />
        </section>

        <section className="chart-grid">
          <div className="panel">
            <ViscosityChart
              data={viscosityData}
              title={`${terminology.measurementCap} con barras de error (±σ)`}
            />
          </div>
          <div className="panel">
            <TemperatureChart data={temperatureData} title="Temperatura del proceso" />
          </div>
        </section>

        <section className="info-grid">
          <div className="info-card">
            <h3>Resumen de sesión</h3>
            <div className="info-row">
              <span>Lotes capturados</span>
              <strong>{measurementCount}</strong>
            </div>
            <div className="info-row">
              <span>Estado actual</span>
              <strong>{isMeasuring ? "Registrando" : "Listo"}</strong>
            </div>
            <div className="info-row">
              <span>Promedio {terminology.measurementCap}</span>
              <strong>
                {historicalData.length > 0
                  ? (
                      historicalData.reduce((sum, d) => sum + d.viscosity, 0) / historicalData.length
                    ).toFixed(selectedDevice === "Q-DENS" ? 3 : 1)
                  : selectedDevice === "Q-DENS" ? "0.000" : "0.0"} {terminology.unit}
              </strong>
            </div>
            <div className="info-row">
              <span>Desviación estándar promedio</span>
              <strong>
                {historicalData.length > 0
                  ? (
                      historicalData.reduce((sum, d) => sum + d.standardDeviation, 0) /
                      historicalData.length
                    ).toFixed(2)
                  : "0.00"}
                σ
              </strong>
            </div>
            <div className="info-row">
              <span>Temperatura mínima / máxima</span>
              <strong>
                {historicalData.length > 0
                  ? `${Math.min(...historicalData.map((d) => d.temperature)).toFixed(1)}°C / ${Math.max(
                      ...historicalData.map((d) => d.temperature)
                    ).toFixed(1)}°C`
                  : "0.0°C / 0.0°C"}
              </strong>
            </div>
          </div>

          <div className="info-card">
            <h3>Información del sistema</h3>
            <div className="info-row">
              <span>Firmware</span>
              <strong>v2.1.4</strong>
            </div>
            <div className="info-row">
              <span>Calibración</span>
              <span className="state-chip ok">Válida</span>
            </div>
            <div className="info-row">
              <span>Modo de medición</span>
              <strong>Batch</strong>
            </div>
            <div className="info-row">
              <span>Tiempo estimado por lote</span>
              <strong>≈ 3 segundos</strong>
            </div>
            <div className="info-row">
              <span>Último servicio</span>
              <strong>{scheduleLabels.lastCalibration}</strong>
            </div>
            <div className="info-row">
              <span>Próximo servicio</span>
              <strong>{scheduleLabels.nextService}</strong>
            </div>
            <div className="info-row">
              <span>Rango de barras de error</span>
              <strong>±1σ</strong>
            </div>
          </div>
        </section>
      </main>
      <FooterBar />
    </div>
  );
}
