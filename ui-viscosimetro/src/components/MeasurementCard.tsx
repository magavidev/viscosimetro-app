import React from "react";

interface MeasurementCardProps {
  title: string;
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
  icon: React.ReactNode;
  trend: "up" | "down" | "stable";
  hasValue?: boolean;
}

const trendCopy: Record<MeasurementCardProps["trend"], string> = {
  up: "En aumento",
  down: "En descenso",
  stable: "Estable",
};

export function MeasurementCard({
  title,
  value,
  unit,
  status,
  icon,
  trend,
  hasValue = true,
}: MeasurementCardProps) {
  const showValue = hasValue;
  const statusClass = showValue ? `metric-status ${status}` : "metric-status no-data";
  const statusText = showValue
    ? status === "normal"
      ? "En rango"
      : status === "warning"
      ? "Atención"
      : "Fuera de rango"
    : "Sin medición";

  return (
    <article className="metric-card">
      <div className="metric-card-header">
        <span>{title}</span>
        <span>{icon}</span>
      </div>
      <div>
        <span className="metric-value">{showValue ? value.toFixed(2) : "--"}</span>
        <span className="metric-unit"> {unit}</span>
      </div>
      <div className={statusClass}>{statusText}</div>
      <div className="metric-trend">{showValue ? trendCopy[trend] : "Sin medición"}</div>
    </article>
  );
}
