import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { setUserEmail, clearUserEmail } from '@/utils/userStorage';

interface AuthContextType {
  user: AccountInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (accounts.length > 0) {
      setUser(accounts[0]);
      setIsLoading(false);
    } else if (inProgress === 'none') {
      setIsLoading(false);
    }
  }, [accounts, inProgress]);

  const login = async () => {
    try {
      setIsLoading(true);
      // Use redirect instead of popup to avoid CORS issues
      await instance.loginRedirect({
        scopes: ['User.Read'],
        prompt: 'select_account',
      });
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear user data immediately
      setUser(null);
      clearUserEmail();
      
      // Use logoutRedirect with explicit postLogoutRedirectUri
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
        account: user || undefined,
      });
      
    } catch (error) {
      console.error('Logout failed:', error);
      // If logout fails, still redirect to home page
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
