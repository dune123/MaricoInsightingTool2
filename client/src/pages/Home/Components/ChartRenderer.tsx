import React, { useState } from 'react';
import { ChartSpec } from '@shared/schema';
import { ChartModal } from './ChartModal';
import { DashboardModal } from './DashboardModal/DashboardModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
  Legend,
  Cell,
} from 'recharts';

interface ChartRendererProps {
  chart: ChartSpec;
  index: number;
  isSingleChart?: boolean;
  showAddButton?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Smart number formatter for axis labels
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

export function ChartRenderer({ chart, index, isSingleChart = false, showAddButton = true }: ChartRendererProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const { type, title, data = [], x, y, xDomain, yDomain, trendLine } = chart;
  const chartColor = COLORS[index % COLORS.length];

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={isSingleChart ? 400 : 250}>
            <LineChart data={data} margin={{ left: 50, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={60}
                tickFormatter={formatAxisLabel}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={y}
                stroke={chartColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={isSingleChart ? 400 : 250}>
            <BarChart data={data} margin={{ left: 50, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={60}
                tickFormatter={formatAxisLabel}
              />
              <Tooltip />
              <Bar dataKey={y} fill={chartColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const getTickCount = (domain: [number, number] | undefined): number => {
          if (!domain) return 6;
          const range = domain[1] - domain[0];
          if (range <= 10) return 6;
          if (range <= 50) return 6;
          if (range <= 100) return 6;
          return 6;
        };

        // Calculate trendline if not provided but we have data
        let trendlineData = trendLine;
        if (!trendlineData && data.length > 0 && xDomain && yDomain) {
          // Calculate linear regression from data points
          const validData = data.filter((d: any) => {
            const xVal = typeof d[x] === 'number' ? d[x] : Number(d[x]);
            const yVal = typeof d[y] === 'number' ? d[y] : Number(d[y]);
            return !isNaN(xVal) && !isNaN(yVal);
          });

          if (validData.length > 1) {
            const xValues = validData.map((d: any) => typeof d[x] === 'number' ? d[x] : Number(d[x]));
            const yValues = validData.map((d: any) => typeof d[y] === 'number' ? d[y] : Number(d[y]));
            
            // Calculate linear regression
            const n = xValues.length;
            const sumX = xValues.reduce((a, b) => a + b, 0);
            const sumY = yValues.reduce((a, b) => a + b, 0);
            const sumXY = xValues.reduce((sum, xi, i) => sum + xi * yValues[i], 0);
            const sumX2 = xValues.reduce((sum, xi) => sum + xi * xi, 0);
            
            const denominator = n * sumX2 - sumX * sumX;
            if (denominator !== 0) {
              const slope = (n * sumXY - sumX * sumY) / denominator;
              const intercept = (sumY - slope * sumX) / n;
              
              // Create trendline points using the domain boundaries
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

        // Use ComposedChart to render scatter with trendline
        return (
          <ResponsiveContainer width="100%" height={isSingleChart ? 400 : 250}>
            <ComposedChart margin={{ left: 50, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                domain={xDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(xDomain)}
              />
              <YAxis
                dataKey={y}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                domain={yDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(yDomain)}
                width={60}
              />
              <Tooltip />
              <Scatter name={`${x} vs ${y}`} data={data} fill={chartColor} fillOpacity={0.6} />
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
          <ResponsiveContainer width="100%" height={isSingleChart ? 400 : 250}>
            <PieChart>
              <Pie
                data={data}
                dataKey={y}
                nameKey={x}
                cx="50%"
                cy="50%"
                innerRadius={isSingleChart ? 60 : 40}
                outerRadius={isSingleChart ? 120 : 80}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={isSingleChart ? 400 : 250}>
            <AreaChart data={data} margin={{ left: 50, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={60}
                tickFormatter={formatAxisLabel}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey={y}
                stroke={chartColor}
                fill={chartColor}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-muted-foreground text-center py-8">Unsupported chart type</p>;
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group">
        <div
          className="cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <h3 className="text-sm font-semibold mb-2 text-foreground line-clamp-2">{title}</h3>
          <div className="w-full">{renderChart()}</div>
        </div>
        {showAddButton && (
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsDashboardModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Dashboard
          </Button>
        )}
      </div>
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        chart={chart}
      />
      <DashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        chart={chart}
      />
    </>
  );
}

