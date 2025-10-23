# 🚀 Render CORS Fix Guide

## ✅ **CORS Issue Fixed**

I've updated the CORS configuration to automatically allow:
- ✅ Your specific Netlify domain: `https://vocal-toffee-30f0ce.netlify.app`
- ✅ Any Netlify domain (`.netlify.app`)
- ✅ Any Vercel domain (`.vercel.app`)
- ✅ Environment variable controlled domains

## 🔧 **Next Steps to Deploy the Fix**

### **Option 1: Automatic Deployment (Recommended)**
If your Render service is connected to GitHub:
1. The changes have been pushed to the `dev` branch
2. Render should automatically redeploy
3. Wait 2-3 minutes for deployment to complete
4. Test your frontend again

### **Option 2: Manual Deployment**
If you need to trigger a manual deployment:
1. Go to your Render dashboard
2. Find your `maricoinsighttool` service
3. Click "Manual Deploy" → "Deploy latest commit"

### **Option 3: Set Environment Variable (Optional)**
To be extra sure, you can set this environment variable in Render:
1. Go to your Render service dashboard
2. Click "Environment" tab
3. Add: `FRONTEND_URL` = `https://vocal-toffee-30f0ce.netlify.app`
4. Save and redeploy

## 🧪 **Testing the Fix**

1. **Wait for deployment to complete** (2-3 minutes)
2. **Open your Netlify frontend**: `https://vocal-toffee-30f0ce.netlify.app`
3. **Try uploading a file** or making an API call
4. **Check browser console** - CORS errors should be gone

## 🔍 **If Still Getting CORS Errors**

1. **Check Render logs** for any deployment errors
2. **Verify the deployment completed successfully**
3. **Clear browser cache** and try again
4. **Check that your backend URL is correct** in the frontend

## 📞 **Quick Verification**

Test your backend directly:
```bash
curl https://maricoinsighttool.onrender.com/api/health
```

Should return: `{"status":"OK","message":"Server is running"}`

---

**The CORS issue should now be resolved! 🎉**
