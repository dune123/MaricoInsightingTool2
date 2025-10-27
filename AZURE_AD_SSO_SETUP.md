# Azure AD SSO Implementation Guide

This guide will help you set up Single Sign-On (SSO) authentication using Azure Active Directory for your Marico Insight application.

## 🚀 What's Been Implemented

### Frontend Components Created:
- **Login.tsx** - Beautiful SSO login page with Azure AD integration
- **AuthContext.tsx** - Authentication state management
- **ProtectedRoute.tsx** - Route protection wrapper
- **msalConfig.ts** - MSAL configuration for Azure AD

### Features:
- ✅ Azure AD SSO authentication
- ✅ User profile display with avatar
- ✅ Secure token management
- ✅ Protected routes
- ✅ Logout functionality
- ✅ Loading states and error handling
- ✅ Responsive design

## 📋 Prerequisites

1. **Azure AD Tenant** - You need access to an Azure AD tenant
2. **Application Registration** - Register your app in Azure AD
3. **Environment Variables** - Configure your .env files

## 🔧 Azure AD Setup

### Step 1: Register Your Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Marico Insight Tool
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: 
     - Type: Single-page application (SPA)
     - URI: `http://localhost:5173` (for development)
     - URI: `https://yourdomain.com` (for production)

### Step 2: Configure Authentication

1. In your app registration, go to **Authentication**
2. Under **Single-page application**, add these redirect URIs:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)
3. Under **Implicit grant and hybrid flows**, check:
   - ✅ Access tokens
   - ✅ ID tokens
4. Click **Save**

### Step 3: Create Client Secret (Optional for SPA)

For Single Page Applications, you typically don't need a client secret, but if you do:

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and expiration
4. Copy the secret value (you won't see it again!)

### Step 4: Configure API Permissions

1. Go to **API permissions**
2. Add these permissions:
   - **Microsoft Graph** → **User.Read** (Delegated)
   - **Microsoft Graph** → **User.ReadBasic.All** (Delegated)
3. Click **Grant admin consent** (if required)

## 🔑 Environment Variables

### Client (.env)
```env
# Azure AD Configuration
VITE_AZURE_CLIENT_ID=your-azure-client-id-here
VITE_AZURE_TENANT_ID=your-azure-tenant-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:5173/auth/callback

# API Configuration
VITE_API_URL=http://localhost:3003
```

### Server (.env) - For future backend integration
```env
# Azure AD Configuration
AZURE_CLIENT_ID=your-azure-client-id-here
AZURE_CLIENT_SECRET=your-azure-client-secret-here
AZURE_TENANT_ID=your-azure-tenant-id-here
AZURE_REDIRECT_URI=http://localhost:3003/auth/callback

# Session Configuration
SESSION_SECRET=your-session-secret-here
```

## 🎯 How to Get Your Azure AD Values

### 1. Client ID (Application ID)
- Go to your app registration → **Overview**
- Copy the **Application (client) ID**

### 2. Tenant ID (Directory ID)
- Go to your app registration → **Overview**
- Copy the **Directory (tenant) ID**

### 3. Client Secret (if needed)
- Go to **Certificates & secrets**
- Copy the **Value** of your client secret

## 🚀 Running the Application

1. **Install dependencies** (already done):
   ```bash
   npm install @azure/msal-browser @azure/msal-react
   ```

2. **Configure environment variables**:
   - Copy the values from Azure AD into your `.env` file

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Test the authentication**:
   - Navigate to `http://localhost:5173`
   - You should see the login page
   - Click "Sign in with Azure AD"
   - Complete the Azure AD authentication flow

## 🔒 Security Features

- **Token Management**: Secure token storage using sessionStorage
- **Route Protection**: All routes are protected by default
- **User Context**: Global authentication state management
- **Logout**: Secure logout with token cleanup
- **Error Handling**: Comprehensive error handling for auth failures

## 🎨 UI Features

- **Beautiful Login Page**: Modern, responsive design
- **User Profile Display**: Shows user avatar, name, and email
- **Loading States**: Smooth loading indicators
- **Error States**: User-friendly error messages
- **Responsive Design**: Works on all device sizes

## 🔧 Customization

### Styling
The login page uses your existing Tailwind CSS setup. You can customize:
- Colors in the Login.tsx component
- Layout in the Layout.tsx component
- Icons and branding

### Authentication Flow
- Modify `msalConfig.ts` to change scopes or configuration
- Update `AuthContext.tsx` for custom user data handling
- Adjust `ProtectedRoute.tsx` for different protection logic

## 🐛 Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Check your redirect URIs in Azure AD match your environment variables

2. **"Client ID not found"**
   - Verify your `VITE_AZURE_CLIENT_ID` in .env file

3. **"Tenant not found"**
   - Check your `VITE_AZURE_TENANT_ID` in .env file

4. **CORS errors**
   - Ensure your redirect URIs are properly configured in Azure AD

### Debug Mode:
Enable debug logging by modifying `msalConfig.ts`:
```typescript
system: {
  loggerOptions: {
    loggerCallback: (level, message, containsPii) => {
      console.log(message); // Enable all logging
    },
  },
},
```

## 📚 Next Steps

1. **Backend Integration**: Implement server-side token validation
2. **User Roles**: Add role-based access control
3. **API Protection**: Secure your API endpoints with Azure AD tokens
4. **Production Deployment**: Configure production redirect URIs

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Azure AD configuration
3. Ensure all environment variables are set correctly
4. Check that your redirect URIs match exactly

---

**🎉 Congratulations!** You now have a fully functional Azure AD SSO system integrated into your Marico Insight application!
