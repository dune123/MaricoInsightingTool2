import React, { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/pages/Layout";
import Home from "@/pages/Home/Home";
import Dashboard from "@/pages/Dashboard/Dashboard";
import Analysis from "@/pages/Analysis/Analysis";
import NotFound from "@/pages/NotFound/not-found";
import { DashboardProvider } from "@/pages/Dashboard/context/DashboardContext";

type PageType = 'home' | 'dashboard' | 'analysis';

function Router() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
  };

  const handleNewChat = () => {
    setCurrentPage('home');
  };

  const handleUploadNew = () => {
    setCurrentPage('home');
    setResetTrigger(prev => prev + 1); // Trigger reset only for new uploads
  };

  const renderPage = () => {
    return (
      <>
        <div className={currentPage === 'home' ? 'block' : 'hidden'}>
          <Home resetTrigger={resetTrigger} />
        </div>
        <div className={currentPage === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard />
        </div>
        <div className={currentPage === 'analysis' ? 'block' : 'hidden'}>
          <Analysis />
        </div>
      </>
    );
  };

  return (
    <Layout 
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onNewChat={handleNewChat}
      onUploadNew={handleUploadNew}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DashboardProvider>
          <Toaster />
          <Router />
        </DashboardProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
