# Redirect URI Mismatch Fix - Port 3000

## 🚨 **Problem Identified**

**Error**: `AADSTS50011: The redirect URI 'http://localhost:5173/auth/callback' specified in the request does not match the redirect URIs configured for the application`

**Root Cause**: Your app is running on port 3000, but Azure AD is configured for port 5173.

## ✅ **Solution Applied**

I've updated your MSAL configuration to use port 3000 instead of 5173.

### **Files Updated**:
- ✅ `msalConfig.ts` - Changed default redirect URI to `http://localhost:3000`

## 🔧 **What You Need to Do**

### **Step 1: Update Your .env File**

Create or update your `.env` file in the client directory:

```env
# Azure AD Configuration
VITE_AZURE_CLIENT_ID=your-azure-client-id-here
VITE_AZURE_TENANT_ID=your-azure-tenant-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:3000

# API Configuration
VITE_API_URL=http://localhost:3002
```

### **Step 2: Update Azure AD App Registration**

1. **Go to [Azure Portal](https://portal.azure.com)**
2. **Navigate to**: Azure Active Directory → App registrations
3. **Select your app registration**
4. **Go to Authentication**
5. **Update Redirect URIs**:
   - **Remove**: `http://localhost:5173` (if it exists)
   - **Add**: `http://localhost:3000`
6. **Save the configuration**

### **Step 3: Verify Your Configuration**

Make sure your Azure AD app registration has:
- **Redirect URIs**: `http://localhost:3000`
- **Supported account types**: Single tenant
- **Implicit grant**: 
  - ✅ Access tokens
  - ✅ ID tokens

## 🚀 **Test the Fix**

1. **Start your development server**:
   ```bash
   cd client
   npm run dev
   ```

2. **Verify the port**:
   - Your app should start on `http://localhost:3000`
   - Check the console for: "Local: http://localhost:3000/"

3. **Test authentication**:
   - Navigate to `http://localhost:3000`
   - Click "Sign in with Azure AD"
   - You should be redirected to Microsoft login
   - Complete authentication
   - You should be redirected back to `http://localhost:3000`

## 🔍 **Debugging Steps**

### **Check Current Configuration**:
1. **Browser Console**: Look for environment variable logs
2. **Network Tab**: Check the redirect URI in the authentication request
3. **Azure Portal**: Verify the redirect URI matches exactly

### **Common Issues**:

1. **Still getting 5173 error**:
   - Clear browser cache
   - Restart development server
   - Check your .env file

2. **Port 3000 not working**:
   - Verify Vite config has `port: 3000`
   - Check if port 3000 is available
   - Try `npm run dev` and check console output

3. **Azure AD still shows 5173**:
   - Double-check Azure AD configuration
   - Wait a few minutes for changes to propagate
   - Try in incognito mode

## 📋 **Environment Variables Checklist**

Make sure your `.env` file has:
- ✅ `VITE_AZURE_CLIENT_ID` - Your Azure app client ID
- ✅ `VITE_AZURE_TENANT_ID` - Your Azure tenant ID  
- ✅ `VITE_AZURE_REDIRECT_URI=http://localhost:3000` - Correct port

## 🎯 **Success Indicators**

When working correctly, you should see:
- ✅ App starts on `http://localhost:3000`
- ✅ No redirect URI mismatch errors
- ✅ Smooth redirect to Microsoft login
- ✅ Successful redirect back to `http://localhost:3000`
- ✅ User profile displayed after login

## 🚀 **Production Deployment**

For production, update:
1. **Azure AD**: Add your production domain (e.g., `https://yourdomain.com`)
2. **Environment**: Update `VITE_AZURE_REDIRECT_URI` to production URL
3. **Vite Config**: Update server port if needed

---

**🎉 The redirect URI mismatch error should now be resolved!**
