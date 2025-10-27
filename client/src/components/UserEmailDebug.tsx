import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserEmail } from '@/utils/userStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

const UserEmailDebug: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const email = getUserEmail();
      setUserEmail(email);
    } else {
      setUserEmail(null);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">User Email Debug</CardTitle>
        <CardDescription>
          Shows the email that will be sent with API requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {userEmail ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Email Available</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">No Email Found</span>
              </>
            )}
          </div>
          
          {userEmail && (
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Email:</p>
              <Badge variant="secondary" className="text-xs">
                {userEmail}
              </Badge>
              <p className="text-xs text-gray-500">
                This email will be sent in the X-User-Email header with all API requests.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserEmailDebug;
