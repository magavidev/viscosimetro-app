import type { IncomingMeasurement } from "../types/measurement";

type JsonLikeRecord = Record<string, unknown>;

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const pickFirstNumber = (data: JsonLikeRecord, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = parseNumber(data[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const parseJsonTelemetry = (raw: string): IncomingMeasurement | null => {
  if (!raw.trim().startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as JsonLikeRecord;
    const viscosity = pickFirstNumber(parsed, ["viscosity", "density", "vis", "dens"]);
    const temperature = pickFirstNumber(parsed, ["temperature", "temp"]);
    const standardDeviation = pickFirstNumber(parsed, ["standardDeviation", "std", "sigma"]);

    if (viscosity === undefined || temperature === undefined) {
      return null;
    }

    return {
      viscosity,
      temperature,
      standardDeviation,
    };
  } catch {
    return null;
  }
};

const parseDelimitedTelemetry = (raw: string): IncomingMeasurement | null => {
  let viscosity: number | undefined;
  let temperature: number | undefined;
  let standardDeviation: number | undefined;

  const pairs = raw.split(/[;,]/);
  for (const pair of pairs) {
    const [rawKey, rawValue] = pair.split(/[:=]/, 2).map((token) => token?.trim() ?? "");
    if (!rawKey || !rawValue) {
      continue;
    }

    const value = parseNumber(rawValue);
    if (value === undefined) {
      continue;
    }

    const key = rawKey.toUpperCase();
    if (["VIS", "VISC", "VISCOSITY", "DENS", "DENSITY"].includes(key)) {
      viscosity = value;
      continue;
    }

    if (["TEMP", "TEMPERATURE", "T"].includes(key)) {
      temperature = value;
      continue;
    }

    if (["STD", "SD", "SIGMA"].includes(key)) {
      standardDeviation = value;
    }
  }

  if (viscosity === undefined || temperature === undefined) {
    return null;
  }

  return {
    viscosity,
    temperature,
    standardDeviation,
  };
};

export const parseTelemetryMessage = (raw: string): IncomingMeasurement | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  return parseJsonTelemetry(trimmed) ?? parseDelimitedTelemetry(trimmed);
};
