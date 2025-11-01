import { useState, useEffect } from 'react';
import { ChartSpec, Dashboard as ServerDashboard } from '@shared/schema';
import { dashboardsApi } from '@/lib/api';

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

  // Load dashboards from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardsApi.list();
        const normalized = res.dashboards.map((d: ServerDashboard) => ({
          id: d.id,
          name: d.name,
          charts: d.charts || [],
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        }));
        setDashboards(normalized);
      } catch (error) {
        console.error('Error loading dashboards from backend:', error);
      }
    })();
  }, []);

  const createDashboard = async (name: string): Promise<DashboardData> => {
    const created = await dashboardsApi.create(name);
    const normalized: DashboardData = {
      id: created.id,
      name: created.name,
      charts: created.charts || [],
      createdAt: new Date(created.createdAt),
      updatedAt: new Date(created.updatedAt),
    };
    setDashboards(prev => [...prev, normalized]);
    return normalized;
  };

  const addChartToDashboard = async (dashboardId: string, chart: ChartSpec) => {
    const updated = await dashboardsApi.addChart(dashboardId, chart);
    const normalized: DashboardData = {
      id: updated.id,
      name: updated.name,
      charts: updated.charts || [],
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
    setDashboards(prev => prev.map(d => d.id === dashboardId ? normalized : d));
  };

  const removeChartFromDashboard = async (dashboardId: string, chartIndex: number) => {
    const updated = await dashboardsApi.removeChart(dashboardId, { index: chartIndex });
    const normalized: DashboardData = {
      id: updated.id,
      name: updated.name,
      charts: updated.charts || [],
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
    setDashboards(prev => prev.map(d => d.id === dashboardId ? normalized : d));
  };

  const deleteDashboard = async (dashboardId: string) => {
    await dashboardsApi.remove(dashboardId);
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
