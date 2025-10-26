import React, { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const { instance } = useMsal();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Handle the redirect response
        const response = await instance.handleRedirectPromise();
        if (response) {
          console.log('Authentication successful:', response);
          // The AuthContext will automatically update the user state
        }
      } catch (error) {
        console.error('Authentication failed:', error);
      }
    };

    handleRedirect();
  }, [instance]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
