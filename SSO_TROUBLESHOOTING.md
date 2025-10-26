# SSO Troubleshooting Guide

## 🔧 Fixed Issues

### 1. **"Stub instance of Public Client Application was called" Error**

**Problem**: This error occurs when MSAL context is used without a proper provider.

**Solution**: ✅ **FIXED** - Updated the component structure:
- Moved `MsalProvider` to the top level in `App.tsx`
- Removed duplicate MSAL providers
- Properly structured the authentication flow

### 2. **Environment Variables Not Loading**

**Problem**: Azure AD configuration not working due to missing environment variables.

**Solution**: ✅ **FIXED** - Added environment variable checking:
- Created `envCheck.ts` to validate required variables
- Added console logging to help debug configuration issues

## 🚀 How to Test the Fix

1. **Start the development server**:
   ```bash
   cd client
   npm run dev
   ```

2. **Check the browser console** for:
   - ✅ "All required environment variables are set"
   - ✅ Client ID, Tenant ID, and Redirect URI status

3. **Test the login flow**:
   - Navigate to `http://localhost:5173`
   - You should see the login page
   - Click "Sign in with Azure AD"
   - Complete the authentication flow

## 🔍 Debugging Steps

### Step 1: Check Environment Variables
Open browser console and look for:
```
✅ All required environment variables are set
Client ID: Set
Tenant ID: Set
Redirect URI: http://localhost:5173/auth/callback
```

### Step 2: Verify Azure AD Configuration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Select your app registration
4. Check **Authentication** settings:
   - Redirect URIs should include: `http://localhost:5173`
   - Supported account types: Single tenant
   - Implicit grant: Access tokens ✅, ID tokens ✅

### Step 3: Test Authentication Flow
1. Click "Sign in with Azure AD" button
2. Should open Microsoft login popup
3. Complete authentication
4. Should redirect back to your app

## 🐛 Common Issues & Solutions

### Issue 1: "Invalid redirect URI"
**Error**: `AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application`

**Solution**:
1. Go to Azure Portal → App registrations → Your app → Authentication
2. Add `http://localhost:5173` to Redirect URIs
3. Save the configuration

### Issue 2: "Client ID not found"
**Error**: `AADSTS700016: Application with identifier was not found`

**Solution**:
1. Check your `.env` file has correct `VITE_AZURE_CLIENT_ID`
2. Verify the Client ID in Azure Portal matches your .env file
3. Restart the development server

### Issue 3: "Tenant not found"
**Error**: `AADSTS90002: Tenant not found`

**Solution**:
1. Check your `.env` file has correct `VITE_AZURE_TENANT_ID`
2. Verify the Tenant ID in Azure Portal
3. Ensure you're using the correct tenant

### Issue 4: Popup blocked
**Error**: `Popup window was blocked`

**Solution**:
1. Allow popups for `localhost:5173`
2. Try using redirect flow instead of popup
3. Check browser popup blocker settings

## 🔧 Alternative Authentication Methods

If popup authentication doesn't work, you can switch to redirect authentication:

### Update msalConfig.ts:
```typescript
export const loginRequest: PopupRequest = {
  scopes: ['User.Read'],
  prompt: 'select_account',
  redirectStartPage: window.location.origin,
};
```

### Update AuthContext.tsx:
```typescript
const login = async () => {
  try {
    setIsLoading(true);
    await instance.loginRedirect({
      scopes: ['User.Read'],
      prompt: 'select_account',
    });
  } catch (error) {
    console.error('Login failed:', error);
    setIsLoading(false);
  }
};
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check browser console** for detailed error messages
2. **Verify Azure AD configuration** in the portal
3. **Test with a simple MSAL example** to isolate the issue
4. **Check network tab** for failed requests

## 🎯 Success Indicators

When everything is working correctly, you should see:

1. ✅ Login page loads without errors
2. ✅ "Sign in with Azure AD" button works
3. ✅ Microsoft login popup/redirect works
4. ✅ User profile displays after login
5. ✅ Logout functionality works
6. ✅ Protected routes require authentication

---

**🎉 If you see all these indicators, your SSO implementation is working correctly!**
