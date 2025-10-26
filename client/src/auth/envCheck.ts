// Environment variables check
export const checkEnvironmentVariables = () => {
  const requiredVars = [
    'VITE_AZURE_CLIENT_ID',
    'VITE_AZURE_TENANT_ID'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    console.error('Please check your .env file and ensure all variables are set.');
    return false;
  }

  console.log('✅ All required environment variables are set');
  console.log('Client ID:', import.meta.env.VITE_AZURE_CLIENT_ID ? 'Set' : 'Missing');
  console.log('Tenant ID:', import.meta.env.VITE_AZURE_TENANT_ID ? 'Set' : 'Missing');
  console.log('Redirect URI:', import.meta.env.VITE_AZURE_REDIRECT_URI || 'Using default (http://localhost:3000)');
  
  return true;
};
