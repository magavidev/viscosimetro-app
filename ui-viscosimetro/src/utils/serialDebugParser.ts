export interface SerialLabelReading {
  key: string;
  value: string;
}

const toDisplayValue = (value: unknown): string | null => {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return String(value);
  }

  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return null;
};

const parseJsonLabels = (raw: string): SerialLabelReading[] => {
  if (!raw.startsWith("{")) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }

    return Object.entries(parsed)
      .map(([key, value]) => {
        const displayValue = toDisplayValue(value);
        if (!displayValue || !key) {
          return null;
        }
        return { key: key.trim(), value: displayValue };
      })
      .filter((reading): reading is SerialLabelReading => reading !== null);
  } catch {
    return [];
  }
};

const parseDelimitedLabels = (raw: string): SerialLabelReading[] => {
  const readings: SerialLabelReading[] = [];
  const pairs = raw.split(/[;,]/);
  for (const pair of pairs) {
    const [rawKey, rawValue] = pair.split(/[:=]/, 2).map((token) => token?.trim() ?? "");
    if (!rawKey || !rawValue) {
      continue;
    }

    readings.push({ key: rawKey, value: rawValue });
  }

  if (readings.length > 0) {
    return readings;
  }

  const fallbackPattern = /([A-Za-z][A-Za-z0-9_-]{0,40})\s*[:=]\s*([^\s,;]+)/g;
  let match = fallbackPattern.exec(raw);
  while (match) {
    readings.push({ key: match[1], value: match[2] });
    match = fallbackPattern.exec(raw);
  }

  return readings;
};

export const extractSerialLabels = (rawMessage: string): SerialLabelReading[] => {
  const trimmed = rawMessage.trim();
  if (!trimmed) {
    return [];
  }

  const jsonLabels = parseJsonLabels(trimmed);
  if (jsonLabels.length > 0) {
    return jsonLabels;
  }

  return parseDelimitedLabels(trimmed);
};
