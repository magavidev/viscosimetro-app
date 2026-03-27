import { useEffect, useMemo, useState } from "react";
import type { ConnectionStatus, IncomingMeasurement } from "../types/measurement";
import { parseTelemetryMessage } from "../utils/telemetryParser";
import { extractSerialLabels, type SerialLabelReading } from "../utils/serialDebugParser";

const DEFAULT_WS_URL = "ws://localhost:8781";

interface UseDeviceWebSocketOptions {
  enabled: boolean;
  onReading: (reading: IncomingMeasurement) => void;
}

interface SerialLabelSnapshot {
  value: string;
  updatedAt: string;
}

export interface SerialDebugInfo {
  messageCount: number;
  parsedReadingCount: number;
  lastMessageHasTelemetry: boolean;
  lastMessageHasError: boolean;
  lastRawMessage: string;
  lastReceivedAt: string | null;
  lastMessageLabels: SerialLabelReading[];
  latestByLabel: Record<string, SerialLabelSnapshot>;
}

const INITIAL_SERIAL_DEBUG_INFO: SerialDebugInfo = {
  messageCount: 0,
  parsedReadingCount: 0,
  lastMessageHasTelemetry: false,
  lastMessageHasError: false,
  lastRawMessage: "",
  lastReceivedAt: null,
  lastMessageLabels: [],
  latestByLabel: {},
};

const extractRawSerialMessage = (wsMessage: string): string => {
  if (!wsMessage.trim().startsWith("{")) {
    return wsMessage;
  }

  try {
    const parsed = JSON.parse(wsMessage) as { raw?: unknown };
    if (typeof parsed.raw === "string" && parsed.raw.trim()) {
      return parsed.raw.trim();
    }
  } catch {
    // Fallback para sobres no estrictamente JSON (por ejemplo, comillas simples).
    const rawMatch = wsMessage.match(/["']raw["']\s*:\s*["']([^"']+)["']/i);
    if (rawMatch?.[1]) {
      return rawMatch[1].replace(/\\n/g, "\n").trim();
    }
  }

  return wsMessage;
};

export function useDeviceWebSocket({ enabled, onReading }: UseDeviceWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [serialDebug, setSerialDebug] = useState<SerialDebugInfo>(INITIAL_SERIAL_DEBUG_INFO);
  const wsUrl = useMemo(
    () => (import.meta.env.VITE_WS_URL as string | undefined) ?? DEFAULT_WS_URL,
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus("disconnected");
      setSerialDebug(INITIAL_SERIAL_DEBUG_INFO);
      return undefined;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      const wsMessage = String(event.data ?? "").trim();
      const rawMessage = extractRawSerialMessage(wsMessage);
      const labels = extractSerialLabels(rawMessage);
      const parsed = parseTelemetryMessage(wsMessage) ?? parseTelemetryMessage(rawMessage);
      const hasErrorLabel = labels.some((label) => {
        const normalized = label.key.toUpperCase();
        return normalized === "ERROR" || normalized === "ERR";
      });
      const hasErrorText = /^ERROR\b/i.test(rawMessage);
      const lastMessageHasError = hasErrorLabel || hasErrorText;
      const now = new Date().toISOString();

      setSerialDebug((previous) => {
        const nextByLabel = { ...previous.latestByLabel };
        for (const label of labels) {
          if (!label.key) {
            continue;
          }
          nextByLabel[label.key] = {
            value: label.value,
            updatedAt: now,
          };
        }

        return {
          messageCount: previous.messageCount + 1,
          parsedReadingCount: previous.parsedReadingCount + (parsed ? 1 : 0),
          lastMessageHasTelemetry: Boolean(parsed),
          lastMessageHasError,
          lastRawMessage: rawMessage,
          lastReceivedAt: now,
          lastMessageLabels: labels,
          latestByLabel: nextByLabel,
        };
      });
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

  return { connectionStatus, serialDebug };
}
