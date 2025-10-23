import React, { createContext, useContext, ReactNode } from 'react';
import { useDashboardState, DashboardData } from '../modules/useDashboardState';

interface DashboardContextType {
  dashboards: DashboardData[];
  currentDashboard: DashboardData | null;
  setCurrentDashboard: (dashboard: DashboardData | null) => void;
  createDashboard: (name: string) => DashboardData;
  addChartToDashboard: (dashboardId: string, chart: any) => void;
  removeChartFromDashboard: (dashboardId: string, chartIndex: number) => void;
  deleteDashboard: (dashboardId: string) => void;
  getDashboardById: (dashboardId: string) => DashboardData | undefined;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const dashboardState = useDashboardState();

  return (
    <DashboardContext.Provider value={dashboardState}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}
