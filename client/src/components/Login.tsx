import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      navigate('/');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2><LogIn size={20} /> Sign in to Vi-Notes</h2>
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input id="email" className="auth-input" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input id="password" className="auth-input" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>

          <button className="btn-primary auth-submit" type="submit"><LogIn size={16} /> Sign In</button>
        </form>
        {error && <p className="auth-feedback error-text">{error}</p>}
        <p className="auth-footer">
          Don't have an account?{' '}
          <span className="auth-link-btn" onClick={() => navigate('/register')}>
            <UserPlus size={14} /> Register
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
