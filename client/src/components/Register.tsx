import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, LogIn } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { email, password });
      setMessage('Registration successful! Please login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setMessage('Registration failed.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2><UserPlus size={20} /> Create your account</h2>
        <form className="auth-form" onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="register-email">Email</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                id="register-email"
                className="auth-input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="register-password">Password</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input
                id="register-password"
                className="auth-input"
                type="password"
                placeholder="Choose a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="btn-primary auth-submit" type="submit"><UserPlus size={16} /> Register</button>
        </form>
        {message && <p className="auth-feedback">{message}</p>}
        <p className="auth-footer">
          Already have an account?{' '}
          <span className="auth-link-btn" onClick={() => navigate('/login')}>
            <LogIn size={14} /> Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
