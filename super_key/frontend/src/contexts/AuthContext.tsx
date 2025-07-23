import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { authApi } from '../lib/api'; // Assuming authApi is defined here

interface User {
  uid: string;
  email: string;
  name: string;
  role: string; // Ensure role is part of the User interface
  wallet?: {
    availableKeys: number;
    totalKeysReceived: number;
    totalKeysTransferred: number;
    totalProvisioned: number;
    totalRevoked: number;
  };
  // Add any other user properties that your backend returns
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authApi.getMe();
      if (response.data.success && response.data.user) {
        const fetchedUser: User = {
          uid: response.data.user.uid,
          email: response.data.user.email,
          name: response.data.user.name,
          role: response.data.user.role, // Crucially, set the role here
          wallet: response.data.user.wallet || { availableKeys: 0, totalKeysReceived: 0, totalKeysTransferred: 0, totalProvisioned: 0, totalRevoked: 0 },
          // Map other properties as needed
        };
        setUser(fetchedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      if (response.data.success) {
        await refreshUser(); // Refresh user data after successful login
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.message || 'An unexpected error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};