import React from "react";

interface MeasurementCardProps {
  title: string;
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
  icon: React.ReactNode;
  trend: "up" | "down" | "stable";
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
}: MeasurementCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card-header">
        <span>{title}</span>
        <span>{icon}</span>
      </div>
      <div>
        <span className="metric-value">{value.toFixed(2)}</span>
        <span className="metric-unit"> {unit}</span>
      </div>
      <div className={`metric-status ${status}`}>
        {status === "normal" && "En rango"}
        {status === "warning" && "Atención"}
        {status === "critical" && "Fuera de rango"}
      </div>
      <div className="metric-trend">{trendCopy[trend]}</div>
    </article>
  );
}
