import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import './Keys.css';

const API_URL = 'http://localhost:3000/api';

interface Key {
  id: string;
  keyId: string;
  status: string;
  createdAt?: string;
  isUsed?: boolean;
}

interface Recipient {
  id: string;
  email: string;
  role: string;
}

const Keys = () => {
  const { currentUser, authToken } = useAuth();
  const [keys, setKeys] = useState<Key[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('mykeys'); // Changed default tab
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [keyCount, setKeyCount] = useState(1);

  const fetchKeys = async () => {
    if (!authToken) {
      console.error('No auth token available');
      return;
    }

    try {
      // Changed from /keys/my-keys to /keys
      const response = await fetch(`${API_URL}/keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Add this line
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch keys');
      }
      
      const data = await response.json();
      console.log('Fetched keys:', data); // Add this debug log
      setKeys(data.keys || []);
    } catch (error) {
      console.error('Failed to fetch keys:', error);
      setError('Failed to fetch keys');
    }
  };

  const fetchRecipients = async () => {
    try {
      const response = await fetch(`${API_URL}/keys/recipients`, {  // Changed from /users/recipients
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Add this line
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch recipients');
      }
      
      const data = await response.json();
      if (data.recipients?.length > 0) {
        setRecipients(data.recipients);
        setSelectedRecipient(data.recipients[0].id);
      }
      setError('');
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
      setError('Failed to fetch recipients');
    }
  };

  const generateKeys = async () => {
    try {
      const response = await fetch(`${API_URL}/keys/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ count: keyCount })
      });
      if (!response.ok) throw new Error('Failed to generate keys');
      await fetchKeys(); // Refresh keys list
      setError('');
    } catch (error) {
      console.error('Failed to generate keys:', error);
      setError('Failed to generate keys');
    }
  };

  const transferKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient) {
      setError('Please select a recipient');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/keys/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: selectedRecipient,
          count: keyCount
        })
      });
      if (!response.ok) throw new Error('Failed to transfer keys');
      await fetchKeys(); // Refresh keys list
      setError('');
    } catch (error) {
      console.error('Failed to transfer keys:', error);
      setError('Failed to transfer keys');
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      const response = await fetch(`${API_URL}/keys/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keyId })
      });
      if (!response.ok) throw new Error('Failed to revoke key');
      await fetchKeys(); // Refresh keys list
      setError('');
    } catch (error) {
      console.error('Failed to revoke key:', error);
      setError('Failed to revoke key');
    }
  };

  useEffect(() => {
    console.log('Current user:', currentUser);
    console.log('Auth token:', authToken);
    console.log('User role:', currentUser?.role);

    if (!currentUser || !authToken) {
      setError('Please log in to view keys');
      return;
    }

    fetchKeys();
    
    // Only fetch recipients for roles that can transfer keys
    if (['super_admin', 'admin', 'distributor'].includes(currentUser.role)) {
      fetchRecipients();
    }
  }, [currentUser, authToken]);

  const renderTabs = () => {
    const userRole = currentUser?.role;
    console.log('Current user role:', userRole); // Add this debug log

    return (
      <div className="tabs-container">
        <div className="tabs">
          {/* My Keys - Always visible */}
          <button 
            className={`tab ${activeTab === 'mykeys' ? 'active' : ''}`}
            onClick={() => setActiveTab('mykeys')}
          >
            My Keys
          </button>

          {/* Create Keys - Super Admin Only */}
          {userRole === 'super_admin' && (
            <button 
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create Keys
            </button>
          )}

          {/* Transfer Keys - Super Admin, Admin, Distributor */}
          {['super_admin', 'admin', 'distributor'].includes(userRole || '') && (
            <button 
              className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              Transfer Keys
            </button>
          )}

          {/* Revoke Keys - Super Admin Only */}
          {userRole === 'super_admin' && (
            <button 
              className={`tab ${activeTab === 'revoke' ? 'active' : ''}`}
              onClick={() => setActiveTab('revoke')}
            >
              Revoke Keys
            </button>
          )}
        </div>

        <div className="tab-content">
          {/* My Keys Tab - All Users */}
          {activeTab === 'mykeys' && (
            <div className="key-section">
              <h3>My Keys</h3>
              {keys.length > 0 ? (
                <table className="key-table">
                  <thead>
                    <tr>
                      <th>Key Code</th>
                      <th>Status</th>
                      <th>Is Used</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map(key => (
                      <tr key={key.id} className="key-row">
                        <td>{key.keyId}</td>
                        <td>{key.status}</td>
                        <td>{key.isUsed ? 'Yes' : 'No'}</td>
                        <td>{new Date(key.createdAt || '').toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No keys available</p>
              )}
            </div>
          )}

          {/* Create Keys Tab - Super Admin Only */}
          {activeTab === 'create' && userRole === 'super_admin' && (
            <div className="key-section">
              <h3>Create New Keys</h3>
              <div className="key-form">
                <input
                  type="number"
                  min="1"
                  value={keyCount}
                  onChange={(e) => setKeyCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="key-input"
                  placeholder="Number of keys"
                />
                <button 
                  onClick={generateKeys}
                  className="btn btn-primary"
                >
                  Generate Keys
                </button>
              </div>
            </div>
          )}

          {/* Transfer Keys Tab */}
          {activeTab === 'transfer' && ['super_admin', 'admin', 'distributor'].includes(userRole) && (
            <div className="key-section">
              <h3>Transfer Keys</h3>
              {recipients.length > 0 ? (
                <form onSubmit={transferKeys} className="key-form">
                  <select
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    className="key-select"
                    required
                  >
                    <option value="">Select Recipient</option>
                    {recipients.map(recipient => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.email} ({recipient.role})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={keyCount}
                    onChange={(e) => setKeyCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="key-input"
                    placeholder="Number of keys"
                    required
                  />
                  <button type="submit" className="btn btn-primary">
                    Transfer
                  </button>
                </form>
              ) : (
                <p>No recipients available</p>
              )}
            </div>
          )}

          {/* Revoke Keys Tab - Super Admin Only */}
          {activeTab === 'revoke' && userRole === 'super_admin' && (
            <div className="key-section">
              <h3>Revoke Keys</h3>
              {keys.length > 0 ? (
                <ul className="key-list">
                  {keys.map(key => (
                    <li key={key.id} className="key-item">
                      <span>{key.keyId}</span>
                      <button 
                        onClick={() => revokeKey(key.keyId)}
                        className="btn btn-danger"
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No keys available</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="keys-container">
      <h2>Key Management</h2>
      {error && <div className="error-message">{error}</div>}
      {renderTabs()}
    </div>
  );
};

export default Keys;