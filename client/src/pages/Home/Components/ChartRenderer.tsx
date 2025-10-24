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
  const chartHeight = isSingleChart ? 450 : 380;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ left: 50, right: 20, top: 30, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
                height={70}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={60}
                label={{ value: y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
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
            <BarChart data={data} margin={{ left: 50, right: 20, top: 30, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
                height={70}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={60}
                label={{ value: y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
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
            <ScatterChart margin={{ left: 50, right: 20, top: 30, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                domain={xDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(xDomain)}
                height={70}
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
              />
              <YAxis
                dataKey={y}
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                domain={yDomain || ['auto', 'auto']}
                tickFormatter={formatAxisLabel}
                tickCount={getTickCount(yDomain)}
                width={60}
                label={{ value: y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
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
            <AreaChart data={data} margin={{ left: 50, right: 20, top: 30, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={x}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                angle={-45}
                textAnchor="end"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: x, position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
                height={70}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatAxisLabel}
                width={60}
                label={{ value: y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 } }}
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
          
          {/* Key Insight and Recommendation */}
          {(chart.keyInsight || chart.recommendation) && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {chart.keyInsight && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Key Insight</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{chart.keyInsight}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {chart.recommendation && (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">Recommendation</p>
                      <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">{chart.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
