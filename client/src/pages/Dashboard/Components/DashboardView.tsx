import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, BarChart3, Trash2 } from 'lucide-react';
import { DashboardData } from '../modules/useDashboardState';
import { ChartRenderer } from '@/pages/Home/Components/ChartRenderer';

interface DashboardViewProps {
  dashboard: DashboardData;
  onBack: () => void;
  onDeleteChart: (chartIndex: number) => void;
}

export function DashboardView({ dashboard, onBack, onDeleteChart }: DashboardViewProps) {
  if (dashboard.charts.length === 0) {
    return (
      <div className="h-[calc(100vh-10vh)] overflow-y-auto bg-white">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{dashboard.name}</h1>
            <p className="text-muted-foreground">No charts in this dashboard yet</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Charts Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            This dashboard doesn't have any charts yet. Go back to your data analysis 
            and add charts to this dashboard using the plus button on any chart.
          </p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboards
          </Button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10vh)] overflow-y-auto bg-white">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{dashboard.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {dashboard.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>{dashboard.charts.length} chart{dashboard.charts.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {dashboard.charts.map((chart, index) => (
          <div key={`${chart.title}-${index}`} className="relative group">
            <ChartRenderer
              chart={chart}
              index={index}
              isSingleChart={false}
              showAddButton={false}
            />
            
            {/* Delete button - positioned at top right of chart */}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg h-8 w-8 z-10"
              style={{ position: 'absolute', top: '8px', right: '8px' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Delete button clicked for chart index:', index);
                onDeleteChart(index);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
