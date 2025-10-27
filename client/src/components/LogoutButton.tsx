import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

const LogoutButton: React.FC = () => {
  const { logout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const isProcessing = isLoading || isLoggingOut;

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      disabled={isProcessing}
      className="w-full flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Signing out...</span>
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </>
      )}
    </Button>
  );
};

export default LogoutButton;
