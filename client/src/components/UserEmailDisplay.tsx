import React, { useState, useEffect } from 'react';
import { getUserEmail } from '@/utils/userStorage';
import { useAuth } from '@/contexts/AuthContext';

const UserEmailDisplay: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [storedEmail, setStoredEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const email = getUserEmail();
      setStoredEmail(email);
    } else {
      setStoredEmail(null);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || !storedEmail) {
    return null;
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-sm font-medium text-blue-900 mb-2">Stored User Email</h3>
      <p className="text-sm text-blue-700">
        <strong>Email:</strong> {storedEmail}
      </p>
      <p className="text-xs text-blue-600 mt-1">
        This email is stored in localStorage and persists across browser sessions.
      </p>
    </div>
  );
};

export default UserEmailDisplay;
