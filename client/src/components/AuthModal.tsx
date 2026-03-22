import React, { useState } from 'react';
import api from '../api';
import { Mail, Lock, User, X, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (isNewUser: boolean) => void;
  initialMode?: 'login' | 'register';
  message?: string | null;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'login', message }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset all states whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMode('login');
      setError('');
      // Reset login fields
      setLoginEmail('');
      setLoginPassword('');
      setShowLoginPassword(false);
      // Reset signup fields
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setShowSignupPassword(false);
      setShowSignupConfirmPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (mode === 'register' && signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' 
        ? { email: loginEmail, password: loginPassword } 
        : { name: signupName, email: signupEmail, password: signupPassword };
      
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      if (data.name) {
        localStorage.setItem('userName', data.name);
      }
      onSuccess(mode === 'register');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-icon" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-mode-toggle">
            <button 
              className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </button>
            <button 
              className={`toggle-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Join Free
            </button>
          </div>
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{mode === 'login' ? 'Sign in to access your notes' : 'Start your writing journey today'}</p>
          {message && <div className="auth-modal-info-banner">{message}</div>}
        </div>

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <>
              <div className="input-group">
                <label htmlFor="signup-name">Full Name</label>
                <div className="input-wrapper">
                  <User size={16} />
                  <input
                    id="signup-name"
                    className="auth-input-slim"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="signup-email">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={16} />
                  <input
                    id="signup-email"
                    className="auth-input-slim"
                    type="email"
                    placeholder="name@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="signup-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="signup-password"
                    className="auth-input-slim"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  >
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="signup-confirm-password">Confirm Password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="signup-confirm-password"
                    className="auth-input-slim"
                    type={showSignupConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    aria-label={showSignupConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showSignupConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="login-email">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={16} />
                  <input
                    id="login-email"
                    className="auth-input-slim"
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="login-password"
                    className="auth-input-slim"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button className="auth-submit-slim" type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : mode === 'login' ? (
              <><LogIn size={18} style={{ marginRight: '8px' }} /> Sign In</>
            ) : (
              <><UserPlus size={18} style={{ marginRight: '8px' }} /> Create Account</>
            )}
          </button>
        </form>

        {error && <p className="auth-modal-error">{error}</p>}
      </div>
    </div>
  );
};

export default AuthModal;
