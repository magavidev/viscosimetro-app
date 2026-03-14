import { useCallback, useMemo, useState } from "react";
import type {
  DeviceType,
  HistoricalDataPoint,
  IncomingMeasurement,
  MeasurementData,
  MetricStatus,
  TrendDirection,
} from "../types/measurement";

const EMPTY_MEASUREMENT: MeasurementData = {
  viscosity: 0,
  temperature: 0,
  standardDeviation: 0,
  timestamp: new Date(),
};

const getNowTimeLabel = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export function useMeasurementSession(selectedDevice: DeviceType | null) {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentData, setCurrentData] = useState<MeasurementData>(EMPTY_MEASUREMENT);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [measurementCount, setMeasurementCount] = useState(0);

  const applyReading = useCallback((reading: IncomingMeasurement) => {
    const timestamp = reading.timestamp ?? new Date();
    const nextData: MeasurementData = {
      viscosity: reading.viscosity,
      temperature: reading.temperature,
      standardDeviation: reading.standardDeviation ?? 0,
      timestamp,
    };

    setCurrentData(nextData);
    setHistoricalData((prev) => [
      ...prev,
      {
        time: getNowTimeLabel(timestamp),
        viscosity: nextData.viscosity,
        temperature: nextData.temperature,
        standardDeviation: nextData.standardDeviation,
      },
    ]);
    setMeasurementCount((prev) => prev + 1);
    setIsMeasuring(false);
  }, []);

  const startMeasurement = useCallback(() => {
    if (isMeasuring) {
      return;
    }

    setIsMeasuring(true);
  }, [isMeasuring]);

  const resetSession = useCallback(() => {
    setIsMeasuring(false);
    setCurrentData({
      viscosity: 0,
      temperature: 0,
      standardDeviation: 0,
      timestamp: new Date(),
    });
    setHistoricalData([]);
    setMeasurementCount(0);
  }, []);

  const getViscosityStatus = useCallback(
    (viscosity: number): MetricStatus => {
      if (viscosity === 0) {
        return "normal";
      }

      if (selectedDevice === "Q-DENS") {
        if (viscosity < 0.9 || viscosity > 1.1) {
          return "critical";
        }
        if (viscosity < 0.95 || viscosity > 1.05) {
          return "warning";
        }
        return "normal";
      }

      if (viscosity < 100 || viscosity > 150) {
        return "critical";
      }
      if (viscosity < 110 || viscosity > 140) {
        return "warning";
      }
      return "normal";
    },
    [selectedDevice],
  );

  const getTemperatureStatus = useCallback((temperature: number): MetricStatus => {
    if (temperature === 0) {
      return "normal";
    }
    if (temperature < 18 || temperature > 30) {
      return "critical";
    }
    if (temperature < 20 || temperature > 28) {
      return "warning";
    }
    return "normal";
  }, []);

  const getStdDevStatus = useCallback((standardDeviation: number): MetricStatus => {
    if (standardDeviation === 0) {
      return "normal";
    }
    if (standardDeviation > 2) {
      return "critical";
    }
    if (standardDeviation > 1.5) {
      return "warning";
    }
    return "normal";
  }, []);

  const getTrend = useCallback(
    (parameter: "viscosity" | "temperature" | "standardDeviation"): TrendDirection => {
      if (historicalData.length < 2) {
        return "stable";
      }

      const recent = historicalData.slice(-2);
      const trend = recent[1][parameter] - recent[0][parameter];
      if (Math.abs(trend) < 0.5) {
        return "stable";
      }
      return trend > 0 ? "up" : "down";
    },
    [historicalData],
  );

  const hasWarnings = useMemo(
    () =>
      measurementCount > 0 &&
      (getViscosityStatus(currentData.viscosity) !== "normal" ||
        getTemperatureStatus(currentData.temperature) !== "normal" ||
        getStdDevStatus(currentData.standardDeviation) !== "normal"),
    [currentData, getStdDevStatus, getTemperatureStatus, getViscosityStatus, measurementCount],
  );

  return {
    isMeasuring,
    currentData,
    historicalData,
    measurementCount,
    hasWarnings,
    applyReading,
    startMeasurement,
    resetSession,
    getViscosityStatus,
    getTemperatureStatus,
    getStdDevStatus,
    getTrend,
  };
}
