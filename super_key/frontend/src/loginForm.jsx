import React, { useState } from 'react';
import { useAuth } from './AuthContext'; 
 
 const LoginForm = () => { 
 
 
   const [email, setEmail] = useState(''); 
   const [password, setPassword] = useState(''); 
   const { login, isLoading, authError } = useAuth(); 
 
   const handleLogin = async (e) => { 
     e.preventDefault(); 
     try { 
       await login(email, password); 
       // Login success is handled by AuthContext, which reloads the page on successful authentication 
     } catch (err) { 
       // Error handling is done within AuthContext and propagated via authError 
       console.error('Login attempt failed:', err); 
     } 
   }; 
 
   return ( 
     <form onSubmit={handleLogin}> 
       <h2>Login</h2> 
       {authError && <div className="error-message">{authError}</div>} 
       <input 
         type="email" 
         value={email} 
         placeholder="Email" 
         onChange={e => setEmail(e.target.value)} 
         required 
       /> 
       <input 
         type="password" 
         value={password} 
         placeholder="Password" 
         onChange={e => setPassword(e.target.value)} 
         required 
       /> 
       <button type="submit" disabled={isLoading}> 
         {isLoading ? 'Logging in...' : 'Login'} 
       </button> 
     </form> 
   ); 
 }; 
 
 export default LoginForm;