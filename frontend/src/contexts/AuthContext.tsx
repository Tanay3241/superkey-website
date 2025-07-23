import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase'; // Import the auth instance
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import signInWithEmailAndPassword
import { onAuthStateChanged } from 'firebase/auth';

interface User {
  uid: string;
  email: string;
  role: string;
  name: string;
  wallet?: {
    availableKeys: number;
    totalKeysReceived: number;
    totalKeysTransferred: number;
    totalProvisioned: number;
    totalRevoked: number;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshUser = async () => {
    try {
      const { data } = await authApi.getMe();
      setUser({
        ...data.user,
        wallet: data.user.wallet || {
          availableKeys: 0,
          totalKeysReceived: 0,
          totalKeysTransferred: 0,
          totalProvisioned: 0,
          totalRevoked: 0
        }
      });
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
      if (error.response?.status === 401) {
        setUser(null);
        setIsAuthenticated(false);
      }
    }
  };

  useEffect(() => {
    // Wait for Firebase Auth to initialize before making API calls
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get ID token and refresh user from backend
        setIsLoading(true);
        try {
          const idToken = await firebaseUser.getIdToken();
          // Optionally, you can call your backend to refresh user/session here
          await refreshUser();
          setIsAuthenticated(true);
        } catch (error) {
          setUser(null);
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('AuthContext: login attempt started');
    setIsLoading(true);
    try {
      // Use Firebase client-side authentication to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      console.log('AuthContext: Firebase sign-in successful, calling authApi.login with ID token');
      // Send the ID token to your backend for session management
      const response = await authApi.login(idToken); // Modify authApi.login to accept idToken
      
      if (!response.user) {
        console.log('AuthContext: no user data in response');
        throw new Error('No user data received');
      }

      console.log('AuthContext: setting user data');
      setUser({
        ...response.user,
        wallet: response.user.wallet || {
          availableKeys: 0,
          totalKeysReceived: 0,
          totalKeysTransferred: 0,
          totalProvisioned: 0,
          totalRevoked: 0
        }
      });
      setIsAuthenticated(true);
      toast.success('Successfully logged in');
    } catch (error: any) {
      console.log('AuthContext: login error caught', {
        error,
        message: error.message,
        type: error.constructor.name,
        response: error.response
      });
      setUser(null);
      setIsAuthenticated(false);
      
      // Ensure we always throw an Error object with a message
      if (error instanceof Error) {
        console.log('AuthContext: rethrowing Error instance');
        throw error;
      } else if (typeof error === 'string') {
        console.log('AuthContext: throwing string error as Error');
        throw new Error(error);
      } else if (error.response?.data?.error) {
        console.log('AuthContext: throwing response error');
        throw new Error(error.response.data.error);
      } else {
        console.log('AuthContext: throwing default error');
        throw new Error('Failed to login. Please check your credentials.');
      }
    } finally {
      console.log('AuthContext: login attempt finished');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser
      }}
    >
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
