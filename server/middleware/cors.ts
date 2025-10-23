import cors from "cors";

// Get allowed origins from environment variables
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:3003', 
    'http://localhost:3004'
  ];
  
  // Add production origins from environment variables
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  if (process.env.NODE_ENV === 'production') {
    // Add common production domains
    origins.push('https://marico-insight.vercel.app');
    origins.push('https://marico-insight.netlify.app');
    origins.push('https://vocal-toffee-30f0ce.netlify.app');
  }
  
  return origins;
};

export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any Netlify domain in production
    if (process.env.NODE_ENV === 'production' && origin && origin.includes('.netlify.app')) {
      console.log('Allowing Netlify domain:', origin);
      return callback(null, true);
    }
    
    // Allow any Vercel domain in production
    if (process.env.NODE_ENV === 'production' && origin && origin.includes('.vercel.app')) {
      console.log('Allowing Vercel domain:', origin);
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
});
