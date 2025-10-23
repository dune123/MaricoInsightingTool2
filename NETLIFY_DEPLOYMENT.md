# Netlify Deployment Guide

## Configuration

The project is now configured for Netlify deployment with the following changes:

### 1. Build Configuration
- **Build command**: `npm run build`
- **Publish directory**: `client/dist`
- **Base directory**: `client`

### 2. Files Created/Modified
- `netlify.toml` - Netlify configuration file
- `client/vite.config.ts` - Updated build output directory
- `client/src/shared/schema.ts` - Local schema file for client
- `client/package.json` - Added zod dependency

### 3. Environment Variables
The app automatically detects production mode and uses:
- **Production**: `https://maricoinsighttool.onrender.com`
- **Development**: `http://localhost:3002`

## Deployment Steps

1. **Connect to Netlify**:
   - Go to [Netlify](https://netlify.com)
   - Connect your GitHub repository
   - Or drag and drop the `client/dist` folder

2. **Build Settings** (if not using netlify.toml):
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`

3. **Environment Variables** (optional):
   - `VITE_API_URL` - Override the API URL if needed

## Troubleshooting

If you encounter build issues:
1. Make sure Node.js version is 18+
2. Check that all dependencies are installed
3. Verify the build command works locally: `cd client && npm run build`

## File Structure After Build
```
client/
├── dist/           # Build output (Netlify publishes this)
│   ├── index.html
│   └── assets/
└── src/
    └── shared/     # Local schema files
```
