import { useEffect, useMemo, useState } from "react";
import type { ConnectionStatus, IncomingMeasurement } from "../types/measurement";
import { parseTelemetryMessage } from "../utils/telemetryParser";

const DEFAULT_WS_URL = "ws://localhost:8781";

interface UseDeviceWebSocketOptions {
  enabled: boolean;
  onReading: (reading: IncomingMeasurement) => void;
}

export function useDeviceWebSocket({ enabled, onReading }: UseDeviceWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const wsUrl = useMemo(
    () => (import.meta.env.VITE_WS_URL as string | undefined) ?? DEFAULT_WS_URL,
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus("disconnected");
      return undefined;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      const parsed = parseTelemetryMessage(String(event.data ?? ""));
      if (parsed) {
        onReading(parsed);
      }
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
    };

    return () => {
      ws.close();
    };
  }, [enabled, onReading, wsUrl]);

  return { connectionStatus };
}
