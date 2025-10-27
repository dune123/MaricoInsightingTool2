import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  LogIn, 
  User, 
  Mail, 
  Building, 
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Login: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.idTokenClaims?.picture as string} alt={user.name || 'User'} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">Welcome back!</CardTitle>
            <CardDescription>
              You are successfully signed in with Azure AD
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Authentication Successful</p>
                  <p className="text-sm text-green-700">Your identity has been verified</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
                
                {user.username && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm text-gray-700">{user.username}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Account:</span>
                  <Badge variant="secondary" className="text-xs">
                    Azure AD
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={logout}
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Marico Insight</CardTitle>
          <CardDescription>
            Sign in with your Azure AD account to access the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Secure Authentication</p>
                <p className="text-sm text-blue-700">Powered by Microsoft Azure AD</p>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              <p>By signing in, you agree to our terms of service and privacy policy.</p>
              <p className="mt-2 text-xs text-blue-600">
                You will be redirected to Microsoft for secure authentication.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting to Microsoft...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Sign in with Azure AD
              </>
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact your administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;