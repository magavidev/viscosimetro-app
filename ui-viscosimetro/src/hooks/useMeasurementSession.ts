import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const measurementTimerRef = useRef<number | null>(null);

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

  const generateSimulatedReading = useCallback(() => {
    const isQDENS = selectedDevice === "Q-DENS";
    return {
      viscosity: isQDENS
        ? Number((0.8 + Math.random() * 0.4).toFixed(3))
        : Number((80 + Math.random() * 80).toFixed(2)),
      temperature: Number((20 + Math.random() * 10).toFixed(2)),
      standardDeviation: isQDENS
        ? Number((0.001 + Math.random() * 0.004).toFixed(4))
        : Number((0.5 + Math.random() * 2).toFixed(2)),
      timestamp: new Date(),
    };
  }, [selectedDevice]);

  const startSimulatedMeasurement = useCallback(() => {
    if (isMeasuring || measurementTimerRef.current !== null) {
      return;
    }

    setIsMeasuring(true);
    measurementTimerRef.current = window.setTimeout(() => {
      measurementTimerRef.current = null;
      applyReading(generateSimulatedReading());
    }, 3000);
  }, [applyReading, generateSimulatedReading, isMeasuring]);

  const resetSession = useCallback(() => {
    if (measurementTimerRef.current !== null) {
      window.clearTimeout(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }

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

  useEffect(
    () => () => {
      if (measurementTimerRef.current !== null) {
        window.clearTimeout(measurementTimerRef.current);
        measurementTimerRef.current = null;
      }
    },
    [],
  );

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
    startSimulatedMeasurement,
    resetSession,
    getViscosityStatus,
    getTemperatureStatus,
    getStdDevStatus,
    getTrend,
  };
}
