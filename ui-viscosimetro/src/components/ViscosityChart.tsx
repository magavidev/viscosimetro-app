
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface MeasurementData {
  time: string;
  viscosity: number;
  standardDeviation?: number;
}

interface ViscosityChartProps {
  data: MeasurementData[];
  title: string;
}

export function ViscosityChart({ data, title }: ViscosityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                fontSize={12}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  fontSize: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="viscosity" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--chart-1))" }}
              >
                {data[0]?.standardDeviation !== undefined && (
                  <ErrorBar 
                    dataKey="standardDeviation" 
                    width={4} 
                    stroke="hsl(var(--chart-1))"
                  />
                )}
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}