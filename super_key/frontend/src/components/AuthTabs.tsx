const AuthTabs = () => {
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      setError('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div>
      {error && 
        <div className="error-message" style={{
          color: 'red',
          padding: '10px',
          margin: '10px 0',
          border: '1px solid red',
          borderRadius: '4px',
          display: error ? 'block' : 'none'
        }}>
          {error}
        </div>
      }
      {/* Rest of form */}
    </div>
  );
};