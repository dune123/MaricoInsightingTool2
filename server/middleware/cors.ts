import cors from "cors";

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) {
      console.log('Request with no origin - allowing');
      return callback(null, true);
    }
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log('Allowing localhost in development:', origin);
        return callback(null, true);
      }
      // Allow all origins in development if CORS_ALLOW_ALL is set
      if (process.env.CORS_ALLOW_ALL === 'true') {
        console.log('Allowing all origins in development:', origin);
        return callback(null, true);
      }
    }
    
    // In production, use pattern matching for common hosting platforms
    if (process.env.NODE_ENV === 'production') {
      // Allow any Netlify domain
      if (origin.includes('.netlify.app')) {
        console.log('Allowing Netlify domain:', origin);
        return callback(null, true);
      }
      
      // Allow any Vercel domain
      if (origin.includes('.vercel.app')) {
        console.log('Allowing Vercel domain:', origin);
        return callback(null, true);
      }
      
      // Allow any Render domain
      if (origin.includes('.onrender.com')) {
        console.log('Allowing Render domain:', origin);
        return callback(null, true);
      }
      
      // Allow any Railway domain
      if (origin.includes('.railway.app')) {
        console.log('Allowing Railway domain:', origin);
        return callback(null, true);
      }
      
      // Allow any custom domain (if it starts with https://)
      if (origin.startsWith('https://') && !origin.includes('.vercel.app') && !origin.includes('.netlify.app')) {
        // Optional: Add additional validation here if needed
        // For now, allow any HTTPS origin in production
        console.log('Allowing custom HTTPS domain:', origin);
        return callback(null, true);
      }
      
      // If CORS_ALLOW_ALL is set in production, allow all origins
      if (process.env.CORS_ALLOW_ALL === 'true') {
        console.log('Allowing all origins in production:', origin);
        return callback(null, true);
      }
    }
    
    // If FRONTEND_URL env var is set, allow it
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      console.log('Allowing FRONTEND_URL:', origin);
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-User-Email',  // Allow custom user email header
    'x-user-email',  // Allow lowercase version too
    'X-User-Name',   // Allow custom user name header
    'x-user-name'    // Allow lowercase version too
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
  preflightContinue: false
});
