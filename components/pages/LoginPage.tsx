"use client";
import { useState } from 'react';
// import { supabase } from '../data/supabaseClient';
import { useAuth } from '../../contexts/auth-context'; // see AuthContext below
import { SignupDialog } from '../signup-dialog';

function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        <p>אנא הכנס פרטי התחברות </p>
        
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

          <button
            type="button"
            onClick={() => setSignupDialogOpen(true)}
            className="signup-button"
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '10px',
              backgroundColor: 'transparent',
              border: '2px solid #4CAF50',
              color: '#4CAF50',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#4CAF50';
            }}
          >
            הירשם
          </button>
        </form>

        <SignupDialog
          open={signupDialogOpen}
          onOpenChange={setSignupDialogOpen}
          onSuccess={() => {
            // Optionally show a message that they can now login
          }}
        />
      </div>
    </div>
  );
}

export default LoginPage;

