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
    const telemetryCandidate = parsed.telemetry;
    const payload =
      telemetryCandidate && typeof telemetryCandidate === "object" && !Array.isArray(telemetryCandidate)
        ? (telemetryCandidate as JsonLikeRecord)
        : parsed;

    const viscosity = pickFirstNumber(payload, [
      "viscosity",
      "VISCOSITY",
      "density",
      "DENSITY",
      "vis",
      "VIS",
      "dens",
      "DENS",
      "VISC",
    ]);
    const temperature = pickFirstNumber(payload, [
      "temperature",
      "TEMPERATURE",
      "temp",
      "TEMP",
      "t",
      "T",
    ]);
    const standardDeviation = pickFirstNumber(payload, [
      "standardDeviation",
      "STD_VISC",
      "std_visc",
      "std",
      "STD",
      "sigma",
      "SIGMA",
      "sd",
      "SD",
    ]);
    const meanViscosity = pickFirstNumber(payload, [
      "meanViscosity",
      "mean_viscosity",
      "M_VICS",
      "m_vics",
      "MEAN_VISC",
      "meanVisc",
    ]);

    if (viscosity === undefined || temperature === undefined) {
      return null;
    }

    return {
      viscosity,
      meanViscosity,
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
  let meanViscosity: number | undefined;

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
      continue;
    }

    if (["M_VICS", "MEAN_VISC", "MEANVISC"].includes(key)) {
      meanViscosity = value;
    }
  }

  if (viscosity === undefined || temperature === undefined) {
    return null;
  }

  return {
    viscosity,
    meanViscosity,
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
