import React, { useState } from 'react';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page refresh
    setError('');
    try {
      // ...adjust API endpoint as needed...
      await axios.post('/api/auth/login', { email, password });
      // ...handle successful login (redirect, set user, etc)...
    } catch (err) {
      setError('Incorrect email id / password');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ...existing form fields... */}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </form>
  );
};

export default Login;
