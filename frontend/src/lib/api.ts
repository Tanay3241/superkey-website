import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://super-key.onrender.com/',
  withCredentials: true
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Unauthorized, clear token and redirect to login
      localStorage.removeItem('authToken');
      // You might want to use a more robust routing solution here, e.g., history.push('/login')
      // For now, a simple window.location.href will suffice for demonstration

    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });

    return data;
  },
  logout: () => api.post('/api/auth/logout'),
  getMe: () => api.get('/api/users/me'),

  sessionLogin: (idToken: string) => api.post('/api/auth/sessionLogin', { idToken }),
  checkSession: () => api.get('/api/auth/checkSession')
};

// Keys API
export const keysApi = {
  create: (count: number, validityInMonths: number) => 
    api.post('/api/keys/generate', { count, validityInMonths }),
  
  transfer: (toUserId: string, count: number) => 
    api.post('/api/keys/transfer', { toUserId, count }),
  
  revoke: (userId: string, count: number, reason?: string) => 
    api.post('/api/keys/revoke', { userId, count, reason }),
    
  getMyKeys: () => api.get('/api/keys/my-keys'),

  getUserKeys: (userId: string) => api.get(`/api/keys/user/${userId}`),

  provisionKey: (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    deviceName: string;
    imei1: string;
    imei2: string;
    keyId: string;
    emi: {
      start_date: string;
      installments_left: number;
      monthly_installment: number;
      total_amount: number;
      down_payment: number;
      amount_left: number;
    }
  }) => api.post('/api/keys/provision', data)
};

// Users API
export const usersApi = {
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
  getUsersByRole: (role: string) => api.get(`/api/users/by-role/${role}`)
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