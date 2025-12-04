import { useState } from 'react';
import { supabase } from '../data/supabaseClient';
import { useAuth } from '../lib/AuthContext'; // see AuthContext below

function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      // signIn will update AuthContext and redirect as needed
    } catch (err: any) {
      setError(err?.message || 'שגיאה בהתחברות');
    }
  };

  return (
    <div className="page-content">
      <div className="login-container">
        <h2>התחברות</h2>
        <p>אנא הכנס פרטי התחברות לצפייה בתפריט</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">שם משתמש :</label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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

