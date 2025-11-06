import React, { useEffect, useState } from 'react';
import { ChartSpec } from '@shared/schema';
import { ChartModal } from './ChartModal';
import { ChartOnlyModal } from '@/pages/Dashboard/Components/ChartOnlyModal';
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
  useChartOnlyModal?: boolean;
  fillParent?: boolean;
  sessionId?: string;
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

export function ChartRenderer({ chart, index, isSingleChart = false, showAddButton = true, useChartOnlyModal = false, fillParent = false, sessionId }: ChartRendererProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [series, setSeries] = useState<any[]>(chart.data || []);
  const { type, title, x, y, xDomain, yDomain, trendLine, xLabel, yLabel } = chart as any;
  const chartColor = COLORS[index % COLORS.length];

  // Reset series when chart changes
  useEffect(() => {
    const chartData = chart.data || [];
    console.log(`📈 ChartRenderer: Chart "${chart.title}" - Data points: ${chartData.length}`);
    setSeries(chartData);
  }, [chart]);

  useEffect(() => {
    let abort = false;
    async function maybeFetch() {
      if (Array.isArray(series) && series.length > 0) return;
      if (!sessionId) return;
      const blobName = (chart as any)?.dataRef?.blobName;
      if (!blobName) return;
      try {
        const resp = await fetch(`/api/charts/${encodeURIComponent(sessionId)}/${index}/full`);
        if (!resp.ok) return;
        const json = await resp.json();
        if (!abort && Array.isArray(json.series)) {
          setSeries(json.series);
        }
      } catch {}
    }
    maybeFetch();
    return () => { abort = true; };
  }, [sessionId, index, series.length, (chart as any)?.dataRef?.blobName]);

  const data = series || [];

  const renderChart = () => {
    switch (type) {
      case 'line':
        // For dual-axis charts, use blue for left axis, red for right axis
        const leftAxisColor = chart.y2 ? '#3b82f6' : chartColor; // Blue for left when dual-axis
        const rightAxisColor = '#ef4444'; // Red for right axis
        
        return (
          <ResponsiveContainer width="100%" height={fillParent ? '100%' : isSingleChart ? 400 : 250}>
            <LineChart data={data} margin={{ left: 50, right: chart.y2 ? 50 : 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 } }}
                height={50}
              />
              {chart.y2 ? (
                <>
                  <YAxis
                    tick={{ fill: leftAxisColor, fontSize: 10, fontWeight: 500 }}
                    width={60}
                    tickFormatter={formatAxisLabel}
                    label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: leftAxisColor, fontSize: 12, fontWeight: 600 } }}
                    yAxisId="left"
                    stroke={leftAxisColor}
                  />
                  <YAxis
                    orientation="right"
                    yAxisId="right"
                    tick={{ fill: rightAxisColor, fontSize: 10, fontWeight: 500 }}
                    width={60}
                    tickFormatter={formatAxisLabel}
                    label={{ value: chart.y2Label || chart.y2, angle: 90, position: 'right', style: { textAnchor: 'middle', fill: rightAxisColor, fontSize: 12, fontWeight: 600 } }}
                    stroke={rightAxisColor}
                  />
                </>
              ) : (
                <YAxis
                  tick={{ fill: leftAxisColor, fontSize: 10, fontWeight: 500 }}
                  width={60}
                  tickFormatter={formatAxisLabel}
                  label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: leftAxisColor, fontSize: 12, fontWeight: 600 } }}
                  stroke={leftAxisColor}
                />
              )}
              <Tooltip />
              {chart.y2 && (
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="line"
                  formatter={(value) => value}
                />
              )}
              <Line
                type="monotone"
                dataKey={y}
                name={chart.y2 ? (yLabel || y) : undefined}
                stroke={leftAxisColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                {...(chart.y2 ? { yAxisId: "left" } : {})}
              />
              {chart.y2 && (
                <Line
                  type="monotone"
                  dataKey={chart.y2 as string}
                  name={chart.y2Label || chart.y2}
                  stroke={rightAxisColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  yAxisId="right"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={fillParent ? '100%' : isSingleChart ? 400 : 250}>
            <BarChart data={data} margin={{ left: 50, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 } }}
                height={50}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={60}
                tickFormatter={formatAxisLabel}
                label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 } }}
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
        if (!trendlineData && data.length > 0) {
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
              
              // Calculate domain boundaries from data if not provided
              let xMin: number, xMax: number;
              if (xDomain && typeof xDomain[0] === 'number' && typeof xDomain[1] === 'number') {
                xMin = xDomain[0];
                xMax = xDomain[1];
              } else {
                // Calculate from actual data
                xMin = Math.min(...xValues);
                xMax = Math.max(...xValues);
                // Add a small padding (5% on each side)
                const xPadding = (xMax - xMin) * 0.05;
                xMin = xMin - xPadding;
                xMax = xMax + xPadding;
              }
              
              // Calculate Y values for trendline at domain boundaries
              const yAtMin = slope * xMin + intercept;
              const yAtMax = slope * xMax + intercept;
              
              trendlineData = [
                { [x]: xMin, [y]: yAtMin },
                { [x]: xMax, [y]: yAtMax },
              ];
            }
          }
        }

        // Custom tooltip for scatter to show exact X, Y values
        const renderScatterTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
          // Some environments don't set `active` reliably; rely on payload presence
          if (!payload || payload.length === 0) return null;
          const p = payload[0]?.payload as any;
          if (!p) return null;
          const xVal = p[x];
          const yVal = p[y];
          return (
            <div style={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '6px 8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>{xLabel || x}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{String(xVal)}</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>{yLabel || y}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{String(yVal)}</div>
            </div>
          );
        };

        // Use ComposedChart to render scatter with trendline
        return (
          <ResponsiveContainer width="100%" height={fillParent ? '100%' : isSingleChart ? 400 : 250}>
            <ComposedChart data={data} margin={{ left: 50, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                domain={xDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(xDomain)}
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 } }}
              />
              <YAxis
                dataKey={y}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                domain={yDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(yDomain)}
                width={60}
                label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 } }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(_value: any, _name: any, props: any) => {
                  const p = (props && props.payload) || {};
                  const yVal = p[y];
                  return [String(yVal), yLabel || y];
                }}
                labelFormatter={(_label: any, payload: any[]) => {
                  const p = payload && payload[0] && payload[0].payload;
                  const xVal = p ? p[x] : '';
                  return `${xLabel || x}: ${String(xVal)}`;
                }}
              />
              <Scatter name={`${y}`} data={data} dataKey={y} fill={chartColor} fillOpacity={0.6} isAnimationActive={false} />
              {trendlineData && trendlineData.length === 2 && (
                <Line
                  type="linear"
                  dataKey={y}
                  data={trendlineData}
                  stroke="#3b82f6"
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
          <ResponsiveContainer width="100%" height={fillParent ? '100%' : isSingleChart ? 400 : 250}>
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
          <ResponsiveContainer width="100%" height={fillParent ? '100%' : isSingleChart ? 400 : 250}>
            <AreaChart data={data} margin={{ left: 50, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                label={{ value: xLabel || x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 } }}
                height={50}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={60}
                tickFormatter={formatAxisLabel}
                label={{ value: yLabel || y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 } }}
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
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group h-full">
        <div
          className={`cursor-pointer ${fillParent ? 'h-full flex flex-col' : ''}`}
          onClick={() => setIsModalOpen(true)}
        >
          <h3 className="text-sm font-semibold mb-2 text-foreground line-clamp-2">{title}</h3>
          <div className={`w-full ${fillParent ? 'flex-1 min-h-0' : ''}`}>{renderChart()}</div>
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
      {useChartOnlyModal ? (
        <ChartOnlyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          chart={chart}
          sessionId={sessionId}
          chartIndex={index}
        />
      ) : (
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        chart={chart}
        sessionId={sessionId}
        chartIndex={index}
      />
      )}
      <DashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        chart={chart}
      />
    </>
  );
}

