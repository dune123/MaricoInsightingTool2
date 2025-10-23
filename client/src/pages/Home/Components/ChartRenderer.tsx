import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Maximize2 } from 'lucide-react';
import { DashboardModal } from './DashboardModal/DashboardModal';
import { ChartModal } from './ChartModal';

interface ChartRendererProps {
  chart: ChartSpec;
  index: number;
  isSingleChart?: boolean;
  showAddButton?: boolean;
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

export function ChartRenderer({ chart, index, isSingleChart = false, showAddButton = true }: ChartRendererProps) {
  const { type, title, data = [], x, y, xDomain, yDomain } = chart;
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  const chartColor = COLORS[index % COLORS.length];
  const chartHeight = isSingleChart ? 400 : 300;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Line
                type="monotone"
                dataKey={y}
                stroke={chartColor}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey={y} fill={chartColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        // Calculate intelligent tick count based on domain range
        const getTickCount = (domain: [number, number] | undefined): number => {
          if (!domain) return 6;
          const range = domain[1] - domain[0];
          if (range <= 10) return 8;
          if (range <= 50) return 8;
          if (range <= 100) return 8;
          return 7;
        };

        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ScatterChart margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                name={x}
                domain={xDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(xDomain)}
              />
              <YAxis
                dataKey={y}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                name={y}
                domain={yDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(yDomain)}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Scatter name={`${x} vs ${y}`} data={data} fill={chartColor} fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={data}
                dataKey={y}
                nameKey={x}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
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
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
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
      <Card 
        className="shadow-none relative group border-0 cursor-pointer hover:shadow-md transition-shadow duration-200" 
        data-testid={`chart-${type}-${index}`}
        onClick={() => setIsChartModalOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              {title}
              <Maximize2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </CardTitle>
            {showAddButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDashboardModalOpen(true);
                }}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renderChart()}
        </CardContent>
      </Card>
      
      <DashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        chart={chart}
      />
      
      <ChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        chart={chart}
      />
    </>
  );
}
