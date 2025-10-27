import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, Trash2, Eye } from 'lucide-react';
import { DashboardData } from '../modules/useDashboardState';

interface DashboardListProps {
  dashboards: DashboardData[];
  onViewDashboard: (dashboard: DashboardData) => void;
  onDeleteDashboard: (dashboardId: string) => void;
}

export function DashboardList({ dashboards, onViewDashboard, onDeleteDashboard }: DashboardListProps) {
  if (dashboards.length === 0) {
    return (
      <div className="h-[calc(100vh-10vh)] flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-6 mb-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No Dashboards Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create your first dashboard by adding charts from your data analysis. 
          Click the plus button on any chart to get started.
        </p>
        <div className="text-sm text-muted-foreground">
          💡 Tip: Upload a file and analyze your data to create charts that can be saved to dashboards
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10vh)] overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Your Dashboards</h1>
          <p className="text-muted-foreground">
            Manage and view your saved dashboards
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map((dashboard) => (
          <Card key={dashboard.id} className="hover:shadow-none transition-shadow border-0">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-foreground mb-1">
                    {dashboard.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created {dashboard.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {dashboard.charts.length} charts
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {dashboard.charts.length === 0 
                    ? 'No charts yet' 
                    : `${dashboard.charts.length} chart${dashboard.charts.length === 1 ? '' : 's'} saved`
                  }
                </p>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => onViewDashboard(dashboard)}
                    className="flex-1"
                    disabled={dashboard.charts.length === 0}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Dashboard
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDeleteDashboard(dashboard.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}
