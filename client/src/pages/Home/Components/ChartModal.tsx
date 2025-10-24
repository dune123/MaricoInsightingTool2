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

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: ChartSpec;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Smart number formatter for axis labels
const formatAxisLabel = (value: number): string => {
  // Handle very small decimals
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toFixed(4);
  }
  
  // Handle decimals
  if (Math.abs(value) < 1000 && value % 1 !== 0) {
    return value.toFixed(2);
  }
  
  // Handle large numbers with K, M, B suffixes
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  } else if (absValue >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  } else if (absValue >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  
  // Handle integers and small numbers
  return value.toFixed(0);
};

export function ChartModal({ isOpen, onClose, chart }: ChartModalProps) {
  const { type, title, data = [], x, y, xDomain, yDomain } = chart;
  const chartColor = COLORS[0]; // Use primary color for modal

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={600}>
            <LineChart data={data} margin={{ left: 80, right: 20, top: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
                height={60}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={90}
                label={{ value: y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
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
          <ResponsiveContainer width="100%" height={600}>
            <BarChart data={data} margin={{ left: 80, right: 20, top: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
                height={60}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={90}
                label={{ value: y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
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

        return (
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart margin={{ left: 80, right: 20, top: 20, bottom: 40 }}>
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
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
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
                label={{ value: y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
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
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={600}>
            <PieChart>
              <Pie
                data={data}
                dataKey={y}
                nameKey={x}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={150}
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
          <ResponsiveContainer width="100%" height={600}>
            <AreaChart data={data} margin={{ left: 80, right: 20, top: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
                height={60}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={90}
                label={{ value: y, angle: -90, position: 'left', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 16, fontWeight: 600 } }}
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
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden [&>button]:hidden">
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
        
        <div className="flex-1 overflow-hidden">
          <div className="h-[600px] w-full mb-4">
            {renderChart()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
