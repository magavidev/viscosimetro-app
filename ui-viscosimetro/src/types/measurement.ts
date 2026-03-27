export type DeviceType = "Q-VISC" | "Q-DENS";
export type ConnectionStatus = "connected" | "disconnected" | "error";
export type TrendDirection = "up" | "down" | "stable";
export type MetricStatus = "normal" | "warning" | "critical";

export interface MeasurementData {
  viscosity: number;
  meanViscosity: number;
  temperature: number;
  standardDeviation: number;
  timestamp: Date;
}

export interface HistoricalDataPoint {
  time: string;
  viscosity: number;
  temperature: number;
  standardDeviation: number;
}

export interface IncomingMeasurement {
  viscosity: number;
  meanViscosity?: number;
  temperature: number;
  standardDeviation?: number;
  timestamp?: Date;
}
