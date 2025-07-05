import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type UserRole = 'super_admin' | 'super_distributor' | 'distributor' | 'retailer';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  shopName?: string;
  role: UserRole;
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const { data } = await authApi.getMe();
      setUser(data.user);
      console.log('AuthContext: User data refreshed:', data.user);
    } catch (error) {
      console.error('AuthContext: Error refreshing user data:', error);
      setAuthError('Failed to refresh user data.');
    }
  };



  useEffect(() => {
    console.log('AuthContext: useEffect triggered.');

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log('AuthContext: onAuthStateChanged triggered. firebaseUser:', firebaseUser ? 'present' : 'null');
      if (firebaseUser) {

        try {
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('authToken', idToken);
          const { data } = await authApi.getMe();
          setUser(data.user);
          console.log('AuthContext: User set after onAuthStateChanged:', data.user);

        } catch (error) {
          console.error('AuthContext: Error fetching user data after auth state change:', error);
          setUser(null);
          setAuthError('Failed to fetch user data. Please check your API connection.');
          localStorage.removeItem('authToken'); // Clear token if fetching user data fails
        } finally {
          setIsLoading(false);
          console.log('AuthContext: setIsLoading(false) after onAuthStateChanged (firebaseUser present).');
        }
      } else {
        // If Firebase user is null, check if we have an authToken in localStorage
        const storedAuthToken = localStorage.getItem('authToken');
        if (storedAuthToken) {
          console.log('AuthContext: Firebase user null, but authToken found. Attempting session check...');
          try {
            const { data } = await authApi.checkSession();
            console.log('AuthContext: authApi.checkSession() response:', data);
            if (data.success && data.customToken) {
              await signInWithCustomToken(auth, data.customToken);
              const reauthenticatedFirebaseUser = auth.currentUser;
              if (reauthenticatedFirebaseUser) {
                const idToken = await reauthenticatedFirebaseUser.getIdToken();
                localStorage.setItem('authToken', idToken);
                const { data: userData } = await authApi.getMe();
                setUser(userData.user);
                console.log('AuthContext: User set after reauthentication:', userData.user);
              }
            }
          } catch (error: any) {
            console.error('AuthContext: Session re-check failed:', error);
            if (error.response && error.response.status === 401) {
              console.log('AuthContext: Session re-check returned 401, user is not authenticated.');
            } else {
              setAuthError('Failed to re-check session. Please check your API connection.');
            }
            setUser(null);
            localStorage.removeItem('authToken');
            console.log('AuthContext: User cleared, token removed after re-check failure.');
          } finally {
            setIsLoading(false);
            console.log('AuthContext: setIsLoading(false) after re-check.');
          }
        } else {
          // If Firebase user is null and no authToken, ensure user state is cleared and loading is false
          setUser(null);
          localStorage.removeItem('authToken');
          console.log('AuthContext: User cleared, token removed (no Firebase user or authToken).');
          setIsLoading(false); // Set loading to false when no firebase user
          console.log('AuthContext: setIsLoading(false) after onAuthStateChanged (firebaseUser null, no token).');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true); // Set loading true at the start of login
    setAuthError(null); // Clear any previous errors
    try {
      // First, authenticate with backend
        const response = await authApi.login(email, password);
        // Sign in to Firebase with the custom token
        await signInWithCustomToken(auth, response.token);
        // After successful Firebase sign-in, get the Firebase ID token and store it
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('authToken', idToken);
          // Call the backend /sessionLogin endpoint to create a session cookie
          console.log('AuthContext: Calling sessionLogin with ID Token:', idToken ? 'Yes' : 'No', 'ID Token length:', idToken?.length);
          await authApi.sessionLogin(idToken);
          console.log('AuthContext: sessionLogin call successful.');
          // Fetch user data after successful Firebase sign-in and token storage
          try {
            const { data } = await authApi.getMe();
            setUser(data.user);
          } catch (error) {
            setAuthError('Failed to fetch user data after login. Please check your API connection.');
            localStorage.removeItem('authToken'); // Clear token if fetching user data fails
            // Re-throw the error to be caught by the outer catch block
            throw error;
          }
        } else {
          // This case should ideally not happen if signInWithCustomToken was successful
          setAuthError('Login failed: Firebase user not found.');
          return;
        }
        // Clear any previous auth errors
        setAuthError(null);
    } catch (error: any) {
      // Set a more specific error message based on the error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          setAuthError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.response.data && error.response.data.error) {
          setAuthError(error.response.data.error);
        } else {
          setAuthError(`Server error: ${error.response.status}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        setAuthError('No response from server. Please check your internet connection.');
      } else if (error.code === 'auth/invalid-custom-token') {
        setAuthError('Authentication token is invalid. Please try again.');
      } else if (error.code === 'auth/custom-token-mismatch') {
        setAuthError('Authentication token is invalid for this application.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setAuthError('Login failed. Please try again later.');
      }
      throw error;
    } finally {
      setIsLoading(false); // Ensure loading is set to false after login attempt
    }
  };

  const logout = async () => {
    console.log('AuthContext: Attempting logout.');
    try {
      await authApi.logout();
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('authToken'); // Clear token on logout
      console.log('AuthContext: Logout successful, user state cleared.');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      throw new Error('Logout failed');
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        isAuthenticated: !!user,
        isLoading,
        authError,
        refreshUser
      }}
    >
      {authError && !isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
            <p className="text-gray-700 mb-4">{authError}</p>
            <p className="text-sm text-gray-500">Please check your configuration or contact support.</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
