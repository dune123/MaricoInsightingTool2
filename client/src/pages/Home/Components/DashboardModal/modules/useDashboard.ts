import { useState } from "react";
import { ChartSpec } from '@shared/schema';

interface useDashboardProps{
    onClose: () => void;
    chart: ChartSpec;
}

export const useDashboard = ({onClose, chart }:useDashboardProps) => {

    const [newDashboardName, setNewDashboardName] = useState('');
  const [selectedDashboard, setSelectedDashboard] = useState('');

  const handleAddToDashboard = () => {
    if (selectedDashboard || newDashboardName.trim()) {
      // Here you would implement the logic to add chart to dashboard
      console.log('Adding chart to dashboard:', {
        chart,
        dashboard: selectedDashboard || newDashboardName,
        isNew: !!newDashboardName.trim()
      });
      onClose();
    }
  };

  const handleCreateNew = () => {
    setSelectedDashboard('');
    setNewDashboardName('');
  };

  return {
    setSelectedDashboard,
    newDashboardName,
    selectedDashboard,
    setNewDashboardName,
    handleAddToDashboard,
    handleCreateNew,
  };
}