import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BarChart3, X } from 'lucide-react';
import { ChartSpec } from '@shared/schema';
import { useDashboardContext } from '@/pages/Dashboard/context/DashboardContext';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: ChartSpec;
}

export function DashboardModal({ isOpen, onClose, chart }: DashboardModalProps) {
  const [newDashboardName, setNewDashboardName] = useState('');
  const [selectedDashboard, setSelectedDashboard] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { dashboards, createDashboard, addChartToDashboard } = useDashboardContext();

  // Filter dashboards based on search query
  const filteredDashboards = dashboards.filter(dashboard =>
    dashboard.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Add Chart to Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Chart Preview */}
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{chart.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {chart.type} Chart
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Select Dashboard */}
          {dashboards.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Search Dashboard</Label>
              <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder="Search dashboards..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    setSelectedDashboard('');
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full"
                />
                
                {showDropdown && searchQuery && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border-0 rounded-md shadow-none max-h-48 overflow-y-auto">
                    {filteredDashboards.length > 0 ? (
                      filteredDashboards.map((dashboard) => (
                        <button
                          key={dashboard.id}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {
                            setSelectedDashboard(dashboard.id);
                            setSearchQuery(dashboard.name);
                            setShowDropdown(false);
                            setNewDashboardName('');
                          }}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="flex-1">{dashboard.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {dashboard.charts.length} charts
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No dashboards found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create New Dashboard */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Create New Dashboard</Label>
            <Input
              placeholder="Enter dashboard name..."
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
            />
          </div>


          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => {
                console.log('Button clicked:', { selectedDashboard, newDashboardName, chart });
                if (selectedDashboard) {
                  // Add to existing dashboard
                  console.log('Adding to existing dashboard:', selectedDashboard);
                  addChartToDashboard(selectedDashboard, chart);
                  onClose();
                } else if (newDashboardName.trim()) {
                  // Create new dashboard and add chart
                  console.log('Creating new dashboard:', newDashboardName.trim());
                  const newDashboard = createDashboard(newDashboardName.trim());
                  addChartToDashboard(newDashboard.id, chart);
                  onClose();
                }
              }}
              disabled={!selectedDashboard && !newDashboardName.trim()}
              className="flex-1"
            >
              {selectedDashboard ? 'Add to Dashboard' : 'Create New Dashboard'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}