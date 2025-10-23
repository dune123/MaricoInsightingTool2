import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Base configuration for your backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://maricoinsighttool.onrender.com' : 'http://localhost:3002');

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging (optional)
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.message || 'Request failed';
      throw new Error(`${error.response.status}: ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error: No response from server');
    } else {
      // Something else happened
      throw new Error(`Request error: ${error.message}`);
    }
  }
);

// Generic API request function
export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  route: string;
  data?: any;
  config?: AxiosRequestConfig;
}

export async function apiRequest<T = any>({
  method,
  route,
  data,
  config = {}
}: ApiRequestOptions): Promise<T> {
  try {
    const response = await apiClient.request({
      method,
      url: route,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    throw error; // Error is already handled by interceptor
  }
}

// Convenience methods for common HTTP methods
export const api = {
  get: <T = any>(route: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: 'GET', route, config }),
  
  post: <T = any>(route: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: 'POST', route, data, config }),
  
  put: <T = any>(route: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: 'PUT', route, data, config }),
  
  patch: <T = any>(route: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: 'PATCH', route, data, config }),
  
  delete: <T = any>(route: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: 'DELETE', route, config }),
};

// File upload helper
export async function uploadFile<T = any>(
  route: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add any additional data to formData
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  return apiRequest<T>({
    method: 'POST',
    route,
    data: formData,
    config: {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  });
}

export default apiClient;
