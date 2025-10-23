import React, { useState } from 'react';
import { useDashboardContext } from './context/DashboardContext';
import { DashboardData } from './modules/useDashboardState';
import { DashboardList } from './Components/DashboardList';
import { DashboardView } from './Components/DashboardView';

export default function Dashboard() {
  const { 
    dashboards, 
    currentDashboard, 
    setCurrentDashboard, 
    deleteDashboard,
    removeChartFromDashboard 
  } = useDashboardContext();

  const handleViewDashboard = (dashboard: DashboardData) => {
    setCurrentDashboard(dashboard);
  };

  const handleBackToList = () => {
    setCurrentDashboard(null);
  };

  const handleDeleteDashboard = (dashboardId: string) => {
    if (confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) {
      deleteDashboard(dashboardId);
    }
  };

  const handleDeleteChart = (chartIndex: number) => {
    console.log('Delete chart clicked:', { chartIndex, currentDashboard: currentDashboard?.id });
    if (currentDashboard && confirm('Are you sure you want to remove this chart from the dashboard?')) {
      console.log('Proceeding with chart deletion');
      removeChartFromDashboard(currentDashboard.id, chartIndex);
      
      // Update the currentDashboard to reflect the changes
      const updatedDashboard = {
        ...currentDashboard,
        charts: currentDashboard.charts.filter((_, index) => index !== chartIndex),
        updatedAt: new Date()
      };
      setCurrentDashboard(updatedDashboard);
    } else {
      console.log('Chart deletion cancelled or no current dashboard');
    }
  };

  if (currentDashboard) {
    return (
      <DashboardView
        dashboard={currentDashboard}
        onBack={handleBackToList}
        onDeleteChart={handleDeleteChart}
      />
    );
  }

  return (
    <DashboardList
      dashboards={dashboards}
      onViewDashboard={handleViewDashboard}
      onDeleteDashboard={handleDeleteDashboard}
    />
  );
}