import { useState, useRef, useEffect } from 'react';
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
import { Plus, Maximize2, GripVertical, Trash2 } from 'lucide-react';
import { DashboardModal } from './DashboardModal/DashboardModal';
import { ChartModal } from './ChartModal';

interface ChartRendererProps {
  chart: ChartSpec;
  index: number;
  isSingleChart?: boolean;
  showAddButton?: boolean;
  onDelete?: () => void;
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

// Resizable component wrapper with corner handles
interface ResizableComponentProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
  minWidth?: number;
  defaultHeight?: number;
  defaultWidth?: number;
  scaleContent?: boolean;
}

function ResizableComponent({ 
  children, 
  className = '', 
  minHeight = 200, 
  minWidth = 300,
  defaultHeight = 300, 
  defaultWidth = 400,
  scaleContent = false
}: ResizableComponentProps) {
  const [dimensions, setDimensions] = useState({ 
    width: defaultWidth, 
    height: defaultHeight 
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(minWidth, e.clientX - rect.left);
      const newHeight = Math.max(minHeight, e.clientY - rect.top);
      
      setDimensions(prev => ({
        width: resizeDirection.includes('e') ? newWidth : prev.width,
        height: resizeDirection.includes('s') ? newHeight : prev.height
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minHeight, minWidth, resizeDirection]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ 
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        display: 'block'
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        {children}
      </div>
      
      {/* Corner resize handles */}
      {/* Bottom-right corner */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-nw-resize bg-transparent hover:bg-blue-200 hover:bg-opacity-30 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      >
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-gray-400 rounded-br"></div>
      </div>
      
      {/* Bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-3 h-2 cursor-ns-resize bg-transparent hover:bg-blue-200 hover:bg-opacity-30 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 's')}
      >
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>
      </div>
      
      {/* Right edge */}
      <div
        className="absolute top-0 right-0 bottom-3 w-2 cursor-ew-resize bg-transparent hover:bg-blue-200 hover:bg-opacity-30 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      >
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 flex flex-col space-y-1">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

export function ResizableChartRenderer({ chart, index, isSingleChart = false, showAddButton = true, onDelete }: ChartRendererProps) {
  const { type, title, data = [], x, y, xDomain, yDomain } = chart;
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  const chartColor = COLORS[index % COLORS.length];
  const chartHeight = isSingleChart ? 450 : 380;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
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
          <ResponsiveContainer width="100%" height="100%">
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
          <ResponsiveContainer width="100%" height="100%">
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
          <ResponsiveContainer width="100%" height="100%">
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
          <ResponsiveContainer width="100%" height="100%">
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
    <div className="space-y-6">
      {/* Chart Component */}
      <ResizableComponent 
        className="shadow-none border-0 cursor-pointer hover:shadow-md transition-shadow duration-200"
        defaultHeight={400}
        defaultWidth={600}
        minHeight={300}
        minWidth={400}
        scaleContent={false}
      >
        <Card 
          className="h-full relative group overflow-hidden"
          data-testid={`chart-${type}-${index}`}
          onClick={() => setIsChartModalOpen(true)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                {title}
                <Maximize2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </CardTitle>
              <div className="flex items-center gap-2">
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
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 h-[calc(100%-80px)]">
            {renderChart()}
          </CardContent>
        </Card>
      </ResizableComponent>

      {/* Key Insight Component */}
      {chart.keyInsight && (
        <ResizableComponent 
          className="shadow-none border-0"
          defaultHeight={120}
          defaultWidth={600}
          minHeight={80}
          minWidth={300}
          scaleContent={false}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Key Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 h-[calc(100%-60px)] overflow-y-auto">
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{chart.keyInsight}</p>
              </div>
            </CardContent>
          </Card>
        </ResizableComponent>
      )}

      {/* Recommendation Component */}
      {chart.recommendation && (
        <ResizableComponent 
          className="shadow-none border-0"
          defaultHeight={120}
          defaultWidth={600}
          minHeight={80}
          minWidth={300}
          scaleContent={false}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-green-900 dark:text-green-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 h-[calc(100%-60px)] overflow-y-auto">
                <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">{chart.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        </ResizableComponent>
      )}
      
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
    </div>
  );
}
