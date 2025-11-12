import { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Dummy authentication - check credentials
    if (username === 'user1' && password === 'password1') {
      onLogin(username);
    } else {
      setError('שם משתמש או סיסמה שגויים');
    }
  };

  return (
    <div className="page-content">
      <div className="login-container">
        <h2>התחברות</h2>
        <p>אנא הכנס פרטי התחברות לצפייה בתפריט</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">שם משתמש:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">סיסמה:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            התחבר
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;

