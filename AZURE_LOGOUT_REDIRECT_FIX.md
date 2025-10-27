# 🔧 Azure AD Logout Redirect Fix

## 🚨 **Problem Identified**

You're seeing the Microsoft logout confirmation page instead of being redirected back to your home screen. This happens because the Azure AD app registration needs to be configured with the correct post-logout redirect URI.

## ✅ **Solution Applied**

I've updated the logout function to properly handle the redirect, but you also need to update your Azure AD app registration.

### **Code Changes Made:**
- ✅ **Removed duplicate redirect** - No more manual `window.location.href`
- ✅ **Added account parameter** - Ensures proper logout for the current user
- ✅ **Added fallback redirect** - If logout fails, still redirects to home
- ✅ **Better error handling** - Graceful fallback with timeout

## 🔧 **Azure AD Configuration Required**

### **Step 1: Update Azure AD App Registration**

1. **Go to [Azure Portal](https://portal.azure.com)**
2. **Navigate to**: Azure Active Directory → App registrations
3. **Find your app**: MaricoInsight (`5e4faaa4-8f8b-4766-a2d5-d382004beea2`)
4. **Go to Authentication**

### **Step 2: Configure Post-Logout Redirect URI**

In the **Single-page application** section:
1. **Find "Front-channel logout URL"** field
2. **Add**: `http://localhost:3000`
3. **Or find "Logout URL"** field and add: `http://localhost:3000`
4. **Save** the configuration

### **Step 3: Verify Configuration**

Your Azure AD app should have:
- ✅ **Redirect URIs**: `http://localhost:3000`
- ✅ **Post-logout redirect URI**: `http://localhost:3000`
- ✅ **Front-channel logout URL**: `http://localhost:3000` (if available)

## 🧪 **Test the Fix**

### **Step 1: Clear Browser Cache**
1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear localStorage** (DevTools → Application → Storage → Clear)

### **Step 2: Test Logout Flow**
1. **Navigate to**: `http://localhost:3000`
2. **Login** with Azure AD
3. **Click "Sign Out"**
4. **Should redirect** to Azure AD logout
5. **Should return** to your home page (not Microsoft logout page)

## 🔍 **Alternative Solutions**

### **Option 1: Use Popup Logout (If Redirect Still Fails)**
```typescript
const logout = async () => {
  try {
    setIsLoading(true);
    setUser(null);
    clearUserEmail();
    
    // Use popup logout instead of redirect
    await instance.logoutPopup({
      postLogoutRedirectUri: window.location.origin,
    });
    
    // Manual redirect after popup closes
    window.location.href = window.location.origin;
  } catch (error) {
    console.error('Logout failed:', error);
    window.location.href = window.location.origin;
  } finally {
    setIsLoading(false);
  }
};
```

### **Option 2: Simple Logout (Skip Azure AD Logout)**
```typescript
const logout = async () => {
  try {
    setIsLoading(true);
    
    // Clear user data
    setUser(null);
    clearUserEmail();
    
    // Clear MSAL cache
    await instance.clearCache();
    
    // Redirect to home page
    window.location.href = window.location.origin;
  } catch (error) {
    console.error('Logout failed:', error);
    window.location.href = window.location.origin;
  } finally {
    setIsLoading(false);
  }
};
```

## 🎯 **Expected Behavior After Fix**

### **Correct Logout Flow:**
1. **User clicks "Sign Out"** → Loading spinner
2. **Data cleared** → User state and localStorage cleaned
3. **Azure AD logout** → Redirects to Microsoft logout
4. **Automatic return** → Redirects back to `http://localhost:3000`
5. **Home page shows** → Login page displayed

### **What You Should See:**
- ✅ **No Microsoft logout page** stuck screen
- ✅ **Direct return** to your app
- ✅ **Login page** ready for next user
- ✅ **Clean state** with no user data

## 🔧 **Debugging Steps**

### **Check Azure AD Configuration:**
1. **Verify post-logout URI** is set to `http://localhost:3000`
2. **Check redirect URIs** include `http://localhost:3000`
3. **Ensure SPA platform** is configured (not Web)

### **Check Browser Network Tab:**
1. **Open DevTools** → Network tab
2. **Click logout** and watch requests
3. **Look for** logout redirect requests
4. **Verify** final redirect goes to your app

### **Check Console Logs:**
```javascript
// Should see these logs:
"User email removed from localStorage"
// And successful redirect to home page
```

## 🚀 **Production Considerations**

For production deployment:
1. **Update Azure AD** with production domain
2. **Update environment variables** with production URLs
3. **Test logout flow** in production environment

---

**🎉 After updating Azure AD configuration, the logout should redirect directly to your home page!**
