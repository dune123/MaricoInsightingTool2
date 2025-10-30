import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ChartSpec } from '@shared/schema';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ComposedChart,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface ChartOnlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: ChartSpec;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const formatAxisLabel = (value: number): string => {
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toFixed(4);
  }
  if (Math.abs(value) < 1000 && value % 1 !== 0) {
    return value.toFixed(2);
  }
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  } else if (absValue >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  } else if (absValue >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  return value.toFixed(0);
};

export function ChartOnlyModal({ isOpen, onClose, chart }: ChartOnlyModalProps) {
  const { type, title, data = [], x, y, xDomain, yDomain, trendLine, xLabel, yLabel } = chart;
  const chartColor = COLORS[0];

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={480}>
            <LineChart data={data} margin={{ left: 60, right: 20, top: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
                height={60}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={90}
                label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '14px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '14px' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px' }}
              />
              <Line
                type="monotone"
                dataKey={y}
                stroke={chartColor}
                strokeWidth={3}
                dot={{ r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={480}>
            <BarChart data={data} margin={{ left: 60, right: 20, top: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
                height={60}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={90}
                label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '14px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '14px' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px' }}
              />
              <Bar dataKey={y} fill={chartColor} radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        const getTickCount = (domain: [number, number] | undefined): number => {
          if (!domain) return 8;
          const range = domain[1] - domain[0];
          if (range <= 10) return 10;
          if (range <= 50) return 10;
          if (range <= 100) return 10;
          return 8;
        };

        let trendlineData = trendLine;
        if (!trendlineData && data.length > 0 && xDomain && yDomain) {
          const validData = data.filter((d: any) => {
            const xVal = typeof d[x] === 'number' ? d[x] : Number(d[x]);
            const yVal = typeof d[y] === 'number' ? d[y] : Number(d[y]);
            return !isNaN(xVal) && !isNaN(yVal);
          });

          if (validData.length > 1) {
            const xValues = validData.map((d: any) => (typeof d[x] === 'number' ? d[x] : Number(d[x])));
            const yValues = validData.map((d: any) => (typeof d[y] === 'number' ? d[y] : Number(d[y])));

            const n = xValues.length;
            const sumX = xValues.reduce((a, b) => a + b, 0);
            const sumY = yValues.reduce((a, b) => a + b, 0);
            const sumXY = xValues.reduce((sum, xi, i) => sum + xi * yValues[i], 0);
            const sumX2 = xValues.reduce((sum, xi) => sum + xi * xi, 0);

            const denominator = n * sumX2 - sumX * sumX;
            if (denominator !== 0) {
              const slope = (n * sumXY - sumX * sumY) / denominator;
              const intercept = (sumY - slope * sumX) / n;

              const xMin = xDomain[0];
              const xMax = xDomain[1];
              const yAtMin = slope * xMin + intercept;
              const yAtMax = slope * xMax + intercept;

              trendlineData = [
                { [x]: xMin, [y]: yAtMin },
                { [x]: xMax, [y]: yAtMax },
              ];
            }
          }
        }

        return (
          <ResponsiveContainer width="100%" height={480}>
            <ComposedChart margin={{ left: 60, right: 20, top: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                domain={xDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(xDomain)}
                height={60}
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
              />
              <YAxis
                dataKey={y}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                domain={yDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(yDomain)}
                width={90}
                label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '14px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '14px' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px' }}
              />
              <Scatter name={`${x} vs ${y}`} data={data} fill={chartColor} fillOpacity={0.8} />
              {trendlineData && trendlineData.length === 2 && (
                <Line
                  type="linear"
                  dataKey={y}
                  data={trendlineData}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={480}>
            <PieChart>
              <Pie
                data={data}
                dataKey={y}
                nameKey={x}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'hsl(var(--foreground))' }}
              >
                {data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '14px',
                }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={480}>
            <AreaChart data={data} margin={{ left: 60, right: 20, top: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
                height={60}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={90}
                label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '14px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '14px' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px' }}
              />
              <Area
                type="monotone"
                dataKey={y}
                stroke={chartColor}
                fill={chartColor}
                fillOpacity={0.3}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-muted-foreground text-center py-8">Unsupported chart type</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full max-h-[90vh] overflow-hidden [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl">
            {title}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="h-[520px] w-full">
          {renderChart()}
        </div>
      </DialogContent>
    </Dialog>
  );
}


