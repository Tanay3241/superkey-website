import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from './AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading: authLoading } = useAuth();

  // Add error state logging
  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Login attempt started');
    setError('');
    try {
      await login(email, password);
      console.log('Login succeeded, navigating');
    } catch (err) {
      console.error('Login error caught:', err);
      setError('Incorrect email ID or password. Please try again.');
    }
  };
  
  // Ensure error container has test ID
  {error && 
    <div data-testid="error-message" className="error-message">
      {error}
    </div>
  }
  <div>
    <h2>Login</h2>
    // In your form element, ensure it's properly structured:
    <form onSubmit={handleLogin}>
      {/* Input fields */}
      {error && 
        <div className="error-message" style={{
          color: 'red',
          padding: '8px',
          backgroundColor: '#ffeeee',
          borderRadius: '4px',
          margin: '10px 0'
        }}>
          {error}
        </div>
      }
    </form>
  </div>
);
};

export default LoginPage;
