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
import { createMsalConfig } from '@/auth/msalConfig';

type PageType = 'home' | 'dashboard' | 'analysis';

function Router() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [resetTrigger, setResetTrigger] = useState(0);
  const [loadedSessionData, setLoadedSessionData] = useState<any>(null);

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
  };

  const handleNewChat = () => {
    setCurrentPage('home');
    setLoadedSessionData(null); // Clear any loaded session data
  };

  const handleUploadNew = () => {
    setCurrentPage('home');
    setResetTrigger(prev => prev + 1); // Trigger reset only for new uploads
    setLoadedSessionData(null); // Clear any loaded session data
  };

  const handleLoadSession = (sessionId: string, sessionData: any) => {
    console.log('🔄 Loading session in App:', sessionId, sessionData);
    setLoadedSessionData(sessionData);
    setCurrentPage('home'); // Navigate to home page with loaded session
  };

  const renderPage = () => {
    return (
      <>
        <div className={currentPage === 'home' ? 'block' : 'hidden'}>
          <Home resetTrigger={resetTrigger} loadedSessionData={loadedSessionData} />
        </div>
        <div className={currentPage === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard />
        </div>
        <div className={currentPage === 'analysis' ? 'block' : 'hidden'}>
          <Analysis onNavigate={handleNavigate} onNewChat={handleNewChat} onLoadSession={handleLoadSession} />
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
const msalInstance = new PublicClientApplication(createMsalConfig());

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
