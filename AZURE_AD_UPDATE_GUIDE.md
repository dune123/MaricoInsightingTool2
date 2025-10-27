# 🔧 Azure AD Configuration Update Guide

## ✅ **Issue Fixed Locally**

I've updated your `.env` file to use the correct redirect URI:
- **Before**: `http://localhost:5173/auth/callback` ❌
- **After**: `http://localhost:3000` ✅

## 🚨 **Now Update Azure AD Portal**

You need to update your Azure AD app registration to match the new redirect URI.

### **Step 1: Go to Azure Portal**
1. Visit [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app: **`5e4faaa4-8f8b-4766-a2d5-d382004beea2`**

### **Step 2: Update Authentication Settings**
1. Click on your app registration
2. Go to **Authentication** (in the left sidebar)
3. Under **Single-page application** section:
   - **Remove**: `http://localhost:5173` (if it exists)
   - **Add**: `http://localhost:3000`
4. Click **Save**

### **Step 3: Verify Configuration**
Make sure your app registration has:
- ✅ **Redirect URIs**: `http://localhost:3000`
- ✅ **Supported account types**: Single tenant
- ✅ **Implicit grant**: Access tokens ✅, ID tokens ✅

## 🧪 **Test the Fix**

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Navigate to**: `http://localhost:3000`
3. **Click**: "Sign in with Azure AD"
4. **Should redirect** to Microsoft login (no more 5173 error)
5. **Complete authentication**
6. **Should redirect back** to `http://localhost:3000`

## 🔍 **Debugging Steps**

### **If you still see 5173 error**:
1. **Check browser console** for environment variable logs
2. **Hard refresh** the page (Ctrl+Shift+R)
3. **Clear browser storage** (Application tab → Storage → Clear)
4. **Restart development server**

### **Check environment variables are loading**:
Open browser console and look for:
```
✅ All required environment variables are set
Client ID: Set
Tenant ID: Set
Redirect URI: http://localhost:3000
```

## 📋 **Current Configuration**

Your app is now configured with:
- **Client ID**: `5e4faaa4-8f8b-4766-a2d5-d382004beea2`
- **Tenant ID**: `afb1a06b-ccfa-4d7e-8049-7deb6643017c`
- **Redirect URI**: `http://localhost:3000`
- **Port**: 3000 (as configured in vite.config.ts)

## 🚀 **Production Deployment**

When you deploy to production, update:
1. **Azure AD**: Add your production domain (e.g., `https://yourdomain.com`)
2. **Environment**: Update `VITE_AZURE_REDIRECT_URI` to production URL
3. **Vite Config**: Update server port if needed

## 🎯 **Success Indicators**

When working correctly, you should see:
- ✅ No redirect URI mismatch errors
- ✅ Smooth redirect to Microsoft login
- ✅ Successful redirect back to `http://localhost:3000`
- ✅ User profile displayed after login
- ✅ Console shows correct redirect URI

---

**🎉 After updating Azure AD, the redirect URI mismatch error should be completely resolved!**
