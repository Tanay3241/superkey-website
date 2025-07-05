import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const Wallet = () => {
  const { currentUser, authToken } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWallet = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/users/wallet', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setWallet(data.wallet);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
  }, [authToken]);

  if (loading) {
    return <div>Loading wallet...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!currentUser) {
    return <div>Please log in to view your wallet.</div>;
  }

  return (
    <div>
      <h1>My Wallet</h1>
      {wallet !== null ? (
        <p>Current Wallet Balance: {wallet}</p>
      ) : (
        <p>No wallet data available.</p>
      )}
    </div>
  );
};

export default Wallet;