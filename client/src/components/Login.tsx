import React, { useState } from 'react';
import api from '../api';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';

const LOCAL_DRAFT_KEY = 'vi-notes-editor-draft';
const LOCAL_PENDING_ANALYSIS_KEY = 'vi-notes-pending-analysis';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);

      const shouldRunAnalysis = localStorage.getItem(LOCAL_PENDING_ANALYSIS_KEY) === '1';
      const rawDraft = localStorage.getItem(LOCAL_DRAFT_KEY);

      if (shouldRunAnalysis && rawDraft) {
        const draft = JSON.parse(rawDraft);
        const createdDocument = await api.post('/documents', {
          title: draft.documentTitle,
          content: draft.content,
          htmlContent: draft.htmlContent,
          pageContents: draft.pageContents,
          editorPreferences: draft.editorPreferences,
          keystrokeData: draft.keystrokeData || [],
          pastedEvents: draft.pastedEvents || [],
        });
        localStorage.removeItem(LOCAL_PENDING_ANALYSIS_KEY);
        navigate(`/documents/${createdDocument.data._id}?analyze=1`);
        return;
      }

      localStorage.removeItem(LOCAL_PENDING_ANALYSIS_KEY);
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
        {location.state && typeof location.state === 'object' && 'message' in location.state && (
          <p className="auth-feedback">{String(location.state.message)}</p>
        )}
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
