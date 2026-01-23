import axios from 'axios';

// Base URLs for microservices
export const AUTH_BASE_URL = 'https://motofix-auth-service.onrender.com';
export const REQUESTS_BASE_URL = 'https://motofix-service-requests.onrender.com';

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
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
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
  
  getAll: () => requestsApi.get('/requests/'),
  
  getById: (id: string) => requestsApi.get(`/requests/${id}`),
  
  updateStatus: (id: string, status: string) =>
    requestsApi.patch(`/requests/${id}/status`, { status }),
};
