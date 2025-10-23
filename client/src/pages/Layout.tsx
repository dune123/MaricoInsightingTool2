import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  BarChart3, 
  TrendingUp, 
  Menu,
  X,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'home' | 'dashboard' | 'analysis';
  onNavigate: (page: 'home' | 'dashboard' | 'analysis') => void;
  onNewChat: () => void;
  onUploadNew?: () => void;
}

export function Layout({ children, currentPage, onNavigate, onNewChat, onUploadNew }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems = [
    {
      id: 'home' as const,
      label: 'Chats',
      icon: MessageSquare,
      description: 'View your conversations'
    },
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: BarChart3,
      description: 'View analytics dashboard'
    },
    {
      id: 'analysis' as const,
      label: 'Analysis',
      icon: TrendingUp,
      description: 'Data analysis tools'
    }
  ];

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300 flex-shrink-0 min-w-16 z-10 p-0 outline-none border-0",
        sidebarOpen ? "w-64 bg-gray-50" : "w-16 bg-white"
      )}>
        {/* Header */}
        <div className="p-4 rounded-md outline-none">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Marico Insight</h1>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8 rounded-md hover:bg-muted"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          {/* Navigation Items */}
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <Button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 rounded-lg transition-colors p-2",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {sidebarOpen && (
                    <div className="flex flex-col items-start">
                      <span className="font-medium leading-none">{item.label}</span>
                      <span className="text-xs opacity-70 mt-0.5">{item.description}</span>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-3 outline-none">
          <div className="flex items-center justify-between">
            <h1>Marico Insighting</h1>
            <div className="flex items-center gap-2">
              {onUploadNew && (
                <Button
                  onClick={onUploadNew}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 rounded-md shadow-sm hover:shadow transition"
                >
                  <Upload className="h-4 w-4" />
                  Upload New File
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
