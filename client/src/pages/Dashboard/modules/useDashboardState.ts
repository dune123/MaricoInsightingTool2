import { useState, useEffect } from 'react';
import { ChartSpec } from '@shared/schema';

export interface DashboardData {
  id: string;
  name: string;
  charts: ChartSpec[];
  createdAt: Date;
  updatedAt: Date;
}

export const useDashboardState = () => {
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardData | null>(null);

  // Load dashboards from localStorage on mount
  useEffect(() => {
    const savedDashboards = localStorage.getItem('marico-dashboards');
    if (savedDashboards) {
      try {
        const parsed = JSON.parse(savedDashboards);
        // Convert date strings back to Date objects
        const dashboardsWithDates = parsed.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt)
        }));
        setDashboards(dashboardsWithDates);
      } catch (error) {
        console.error('Error loading dashboards from localStorage:', error);
      }
    }
  }, []);

  // Save dashboards to localStorage only on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dashboards.length > 0) {
        localStorage.setItem('marico-dashboards', JSON.stringify(dashboards));
      } else {
        // Clear localStorage if no dashboards
        localStorage.removeItem('marico-dashboards');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Removed [dashboards] dependency to prevent auto-save on state changes

  const createDashboard = (name: string): DashboardData => {
    const newDashboard: DashboardData = {
      id: `dashboard-${Date.now()}`,
      name,
      charts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setDashboards(prev => [...prev, newDashboard]);
    return newDashboard;
  };

  const addChartToDashboard = (dashboardId: string, chart: ChartSpec) => {
    console.log('Adding chart to dashboard:', { dashboardId, chart });
    
    try {
      setDashboards(prev => {
        const dashboardExists = prev.find(d => d.id === dashboardId);
        if (!dashboardExists) {
          console.error('Dashboard not found:', dashboardId);
          return prev;
        }
        
        const updated = prev.map(dashboard => 
          dashboard.id === dashboardId 
            ? {
                ...dashboard,
                charts: [...dashboard.charts, chart],
                updatedAt: new Date()
              }
            : dashboard
        );
        console.log('Updated dashboards:', updated);
        console.log('Charts count for dashboard:', updated.find(d => d.id === dashboardId)?.charts.length);
        return updated;
      });
    } catch (error) {
      console.error('Error adding chart to dashboard:', error);
    }
  };

  const removeChartFromDashboard = (dashboardId: string, chartIndex: number) => {
    console.log('Removing chart from dashboard:', { dashboardId, chartIndex });
    
    try {
      setDashboards(prev => {
        const dashboardExists = prev.find(d => d.id === dashboardId);
        if (!dashboardExists) {
          console.error('Dashboard not found for deletion:', dashboardId);
          return prev;
        }
        
        const updated = prev.map(dashboard => 
          dashboard.id === dashboardId 
            ? {
                ...dashboard,
                charts: dashboard.charts.filter((_, index) => index !== chartIndex),
                updatedAt: new Date()
              }
            : dashboard
        );
        console.log('Updated dashboards after deletion:', updated);
        console.log('Charts count after deletion:', updated.find(d => d.id === dashboardId)?.charts.length);
        return updated;
      });
    } catch (error) {
      console.error('Error removing chart from dashboard:', error);
    }
  };

  const deleteDashboard = (dashboardId: string) => {
    setDashboards(prev => prev.filter(dashboard => dashboard.id !== dashboardId));
    if (currentDashboard?.id === dashboardId) {
      setCurrentDashboard(null);
    }
  };

  const getDashboardById = (dashboardId: string): DashboardData | undefined => {
    return dashboards.find(dashboard => dashboard.id === dashboardId);
  };

  return {
    dashboards,
    currentDashboard,
    setCurrentDashboard,
    createDashboard,
    addChartToDashboard,
    removeChartFromDashboard,
    deleteDashboard,
    getDashboardById
  };
};
