import React from 'react';
import { useNavigate } from 'react-router-dom';

const LogoutButton = ({ onClick }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onClick(); // Call the logout function passed from AuthContext
    navigate('/login');
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
};

export default LogoutButton;