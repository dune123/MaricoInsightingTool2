# 🚀 Deployment Guide for Marico Insight Tool

This guide will help you deploy both your frontend and backend while avoiding CORS errors.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository (GitHub recommended)
- API keys for OpenAI and Gemini (if using)

## 🎯 Deployment Options

### Option 1: Vercel (Recommended for Full-Stack)

Vercel is perfect for full-stack applications and handles CORS automatically.

#### Steps:
1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel Dashboard:**
   - `FRONTEND_URL`: Your Vercel app URL
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GEMINI_API_KEY`: Your Gemini API key

### Option 2: Railway (Great for Backend + Frontend)

Railway provides excellent support for Node.js applications.

#### Steps:
1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize and Deploy:**
   ```bash
   railway init
   railway up
   ```

4. **Set Environment Variables:**
   ```bash
   railway variables set FRONTEND_URL=https://your-frontend-domain.com
   railway variables set OPENAI_API_KEY=your_key_here
   railway variables set GEMINI_API_KEY=your_key_here
   ```

### Option 3: Render (Free Tier Available)

Render offers free hosting with automatic deployments.

#### Steps:
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm run build`
4. Set start command: `npm run start`
5. Add environment variables in the dashboard

### Option 4: Docker Deployment

For self-hosting or VPS deployment.

#### Steps:
1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **Or build manually:**
   ```bash
   docker build -t marico-insight .
   docker run -p 3002:3002 -e FRONTEND_URL=http://localhost:3002 marico-insight
   ```

## 🔧 Environment Variables

Create a `.env` file in your server directory with:

```env
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://your-frontend-domain.com
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## 🌐 CORS Configuration

The CORS configuration has been updated to:
- ✅ Allow your production frontend domain
- ✅ Handle environment-based origins
- ✅ Support credentials
- ✅ Include proper headers

## 📱 Frontend Deployment

### For Vercel:
1. Connect your GitHub repository
2. Set build command: `cd client && npm run build`
3. Set output directory: `client/dist`
4. Add environment variable: `VITE_API_URL=https://your-backend-domain.com`

### For Netlify:
1. Connect your GitHub repository
2. Set build command: `cd client && npm run build`
3. Set publish directory: `client/dist`
4. Add environment variable: `VITE_API_URL=https://your-backend-domain.com`

## 🔍 Testing Your Deployment

1. **Check Backend Health:**
   ```bash
   curl https://your-backend-domain.com/api/health
   ```

2. **Test CORS:**
   Open browser console on your frontend and check for CORS errors.

3. **Test File Upload:**
   Try uploading a file to ensure the full flow works.

## 🚨 Troubleshooting

### CORS Errors:
- Ensure `FRONTEND_URL` environment variable is set correctly
- Check that your frontend domain is in the allowed origins
- Verify the API base URL in your frontend configuration

### Build Errors:
- Make sure all dependencies are installed
- Check that all environment variables are set
- Verify your Node.js version (18+)

### File Upload Issues:
- Check file size limits
- Verify multer configuration
- Ensure proper error handling

## 📊 Monitoring

Consider adding:
- Health check endpoints
- Error logging
- Performance monitoring
- Uptime monitoring

## 🔄 Continuous Deployment

Set up automatic deployments:
1. Connect your GitHub repository
2. Enable auto-deploy on push to main branch
3. Set up staging environment for testing

## 📞 Support

If you encounter issues:
1. Check the logs in your deployment platform
2. Verify environment variables
3. Test locally first
4. Check CORS configuration

---

**Happy Deploying! 🎉**
