// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./LoginPage";
import RegisterPage from "./registerPage";
import CurrentUser from "./currentUser";
import LoginForm from "./loginForm";
import Wallet from "./wallet";
import { useAuth } from './AuthContext'; // Import useAuth

function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/loginNew" element={<LoginForm />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected routes */}
        <Route
          path="/currentUser"
          element={currentUser ? <CurrentUser /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/wallet"
          element={currentUser ? <Wallet /> : <Navigate to="/login" replace />}
        />
        {/* Redirect to /currentUser if logged in, otherwise to /login */}
        <Route
          path="*"
          element={currentUser ? <Navigate to="/currentUser" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
