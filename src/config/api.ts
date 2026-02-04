import axios from 'axios';

// Base URLs for microservices
export const AUTH_BASE_URL = 'https://motofix-auth-service.onrender.com';
export const REQUESTS_BASE_URL = 'https://motofix-service-requests.onrender.com';

// Add startup logging
console.log('🚀 Initializing Motofix API:', {
  AUTH_BASE_URL,
  REQUESTS_BASE_URL,
  timestamp: new Date().toISOString(),
});

// Create axios instances
export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send/receive httpOnly cookies from the API
  timeout: 30000, // 30s for slow networks
});

export const requestsApi = axios.create({
  baseURL: REQUESTS_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// JWT interceptor for authenticated requests
const addAuthInterceptor = (instance: ReturnType<typeof axios.create>) => {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('motofix_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        headers: config.headers,
      });
      return config;
    },
    (error) => {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      console.log(`📥 Response from ${response.config.url}:`, response.status, response.data);
      return response;
    },
    (error) => {
      console.error('❌ Response error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data,
        message: error.message,
      });
      
      if (error.response?.status === 401) {
        localStorage.removeItem('motofix_token');
        localStorage.removeItem('motofix_user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(authApi);
addAuthInterceptor(requestsApi);

// Auth API functions
export const authService = {
  sendOtp: (phone: string) => 
    authApi.post('/auth/send-otp', { phone }),
  
  login: (phone: string, otp: string, fullName?: string) =>
    authApi.post('/auth/login', { 
      phone, 
      otp, 
      full_name: fullName,
      role: 'driver' 
    }),
  
  logout: () => authApi.post('/auth/logout'),
  
  getMe: () => authApi.get('/auth/me'),
};

// Requests API functions
export const requestsService = {
  create: (data: {
    customer_name: string;
    service_type: string;
    location: string;
    description: string;
    phone: string;
  }) => requestsApi.post('/requests/', data),
  
  createWithMedia: (formData: FormData) => {
    // For file uploads, use the dedicated FormData endpoint
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    // Use the /requests-with-media/ endpoint for FormData submissions
    return requestsApi.post('/requests-with-media/', formData, config);
  },
  
  getAll: () => requestsApi.get('/requests/'),
  
  getById: (id: string) => requestsApi.get(`/requests/${id}`),
  
  updateStatus: (id: string, status: string) =>
    requestsApi.patch(`/requests/${id}/status`, { status }),
  
  getCallPartner: (id: string) =>
    requestsApi.get<{ phone: string }>(`/requests/${id}/call-partner`),
};
