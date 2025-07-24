import axios from 'axios';
import { auth } from '@/lib/firebase';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add the token to every request
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Get token without forcing refresh every time
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      // Store token in localStorage as a backup
      localStorage.setItem('authToken', token);
    } else {
      // Try to use token from localStorage if available
      const cachedToken = localStorage.getItem('authToken');
      if (cachedToken) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
        // Try to refresh the session with the cached token
        authApi.checkSession().catch(() => {
          // If session check fails, clear the token
          localStorage.removeItem('authToken');
        });
      }
    }
    return config;
  } catch (error) {
    console.error('Error getting token:', error);
    return config;
  }
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      // Clear cached token if it's invalid
      localStorage.removeItem('authToken');
      error.message = 'Your session has expired. Please log in again.';
    } else if (error.response?.data?.error) {
      error.message = error.response.data.error;
    } else if (error.response?.status === 403) {
      error.message = 'You do not have permission to perform this action.';
    } else if (error.message.includes('Network Error')) {
      error.message = 'Unable to connect to the server. Please check your connection.';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (idToken: string) => { // Change parameters to accept idToken
    try {
      console.log('Attempting login with ID token');
      // Send the ID token in the Authorization header
      const response = await api.post('/api/auth/login', {}, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      console.log('Login response:', response.data);
      
      if (!response.data.success) {
        console.log('Login failed - success false:', response.data.error);
        throw new Error(response.data.error || 'Login failed');
      }
      return response.data;
    } catch (error: any) {
      console.log('Login error details:', {
        error,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.error || 
                         (error.response?.status === 401 ? 'Incorrect email or password' : 
                          error.message || 'Login failed');
      console.log('Final error message:', errorMessage);
      throw new Error(errorMessage);
    }
  },
  
  logout: () => api.post('/api/auth/logout'),
  
  getMe: () => api.get('/api/users/me'),
  
  checkSession: () => api.get('/api/auth/checkSession'),
};

// Users API
export const usersApi = {
  getAllUsers: () => api.get('/api/users'),
  
  getUserDetails: (userId: string) => api.get(`/api/users/${userId}`),
  
  createSuperDistributor: (data: {
    email: string;
    name: string;
    phone: string;
    password: string;
  }) => api.post('/api/users/super-distributor', data),

  createDistributor: (data: {
    email: string;
    name: string;
    phone: string;
    password: string;
    superDistributorId: string;
  }) => api.post('/api/users/distributor', data),

  createRetailer: (data: {
    email: string;
    name: string;
    phone: string;
    password: string;
    shopName: string;
    paymentQr: string;
    superDistributorId: string;
    distributorId: string;
  }) => api.post('/api/users/retailer', data),

  getHierarchy: () => api.get('/api/users/hierarchy'),
  
  getUsersByRole: (role: string) => api.get(`/api/users/by-role/${role}`),

  getDistributorsBySuperDistributor: (superDistributorId: string) => 
    api.get(`/api/users/distributors/by-super-distributor/${superDistributorId}`),
};

// Keys API
export const keysApi = {
  create: (count: number, validityInMonths: number = 12) => api.post('/api/keys/generate', { count, validityInMonths }),
  getAll: async () => {
    const response = await api.get('/api/keys');
    return { ...response, data: response.data.keys };
  },
  revoke: (keyId: string, count: number = 1, reason: string = '') => api.post('/api/keys/revoke', { userId: keyId, count, reason }),
  transfer: (recipientId: string, count: number) => api.post('/api/keys/transfer', { toUserId: recipientId, count }),
  getUserKeys: (userId: string) => api.get(`/api/keys/user/${userId}`),
  getHistory: (keyId: string) => api.get(`/api/keys/${keyId}/history`),
  getTransactions: (cursor?: string | null, pageSize: number = 10) => 
    api.get('/api/keys/transactions', { 
      params: { 
        cursor: cursor || undefined,
        pageSize,
      }
    }),
};

// Types
export interface CreateUserData {
  email: string;
  name: string;
  phone: string;
  password: string;
  shopName?: string;
  paymentQr?: string;
  superDistributorId?: string;
  distributorId?: string;
}

export default api;