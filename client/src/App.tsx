import React, { useState, useEffect } from "react";
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
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from '@/auth/msalConfig';

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

// Component to handle authentication redirects
function AuthRedirectHandler() {
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(true);

  useEffect(() => {
    // Check if we're handling a redirect
    const urlParams = new URLSearchParams(window.location.search);
    const isRedirect = urlParams.has('code') || urlParams.has('error');
    
    if (isRedirect) {
      // We're in a redirect flow, show the callback component
      setIsHandlingRedirect(true);
    } else {
      // Normal app flow
      setIsHandlingRedirect(false);
    }
  }, []);

  if (isHandlingRedirect) {
    return <AuthCallback />;
  }

  return <Router />;
}

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <ProtectedRoute>
              <DashboardProvider>
                <Toaster />
                <AuthRedirectHandler />
              </DashboardProvider>
            </ProtectedRoute>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </MsalProvider>
  );
}

export default App;
