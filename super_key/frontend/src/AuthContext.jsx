import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './config/firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        setAuthToken(idToken);
        // Fetch user data from your backend using the idToken
        try {
          console.log('AuthContext: Attempting to fetch user data after Firebase auth state change...');
          const response = await fetch('http://localhost:3000/api/users/me', {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          console.log(`AuthContext: User data fetch response status: ${response.status}`);
          const data = await response.json();
          if (response.ok) {
            setCurrentUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user)); // Keep localStorage updated
            console.log('AuthContext: User data fetched successfully', data.user);
          } else {
            console.error('AuthContext: Failed to fetch user data:', data.error);
            // If backend fails to validate token or fetch user, log out
            handleLogout();
          }
        } catch (error) {
          console.error('AuthContext: Error fetching user data:', error);
          handleLogout();
        }
      } else {
        // No Firebase user, clear state
        handleLogout();
      }
      setLoading(false);
    });

    // Check for existing token in localStorage on initial load
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      // Attempt to sign in with custom token (Firebase ID token from backend)
      // Note: This assumes the 'token' in localStorage is a Firebase ID token
      // If it's a custom token from your backend, you'd use signInWithCustomToken
      // If it's a Firebase ID token, onAuthStateChanged should handle it.
      // For now, we'll rely on onAuthStateChanged and ensure the backend returns a valid ID token.
      // If the token is expired or invalid, onAuthStateChanged will eventually set user to null.
    }

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
          console.error('Firebase auth error:', error);
          throw error;
        });
      const idToken = await userCredential.user.getIdToken();
      console.log('AuthContext: idToken generated:', idToken);

      // Send ID token to backend for session establishment and custom token generation (if applicable)
      // Send ID token to backend for session establishment
      const sessionLoginResponse = await fetch('http://localhost:3000/api/auth/sessionLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken })
      });

      const sessionLoginData = await sessionLoginResponse.json();
      if (!sessionLoginResponse.ok) {
        const errorData = await sessionLoginResponse.json();
        throw new Error(errorData.message || 'Authentication failed');
      }

      // After successful session establishment, fetch user data
      const userResponse = await fetch('http://localhost:3000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const userData = await userResponse.json();

      if (userResponse.ok) {
        localStorage.setItem('user', JSON.stringify(userData.user)); // Store user data
        setCurrentUser(userData.user);
        setAuthToken(idToken);
        return { success: true };
      } else {
        throw new Error(userData.error || 'Failed to fetch user data after session login');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Invalid email or password';
      console.error('Login error:', message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setAuthToken(null);
  };

  const value = {
    currentUser,
    authToken,
    loading,
    login,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};