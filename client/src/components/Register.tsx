import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, LogIn } from 'lucide-react';

const LOCAL_DRAFT_KEY = 'vi-notes-editor-draft';
const LOCAL_PENDING_ANALYSIS_KEY = 'vi-notes-pending-analysis';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/register', { email, password });
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
      setMessage('Registration failed.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2><img src="/logo.svg" alt="Vi-Notes" width="28" height="28" style={{ marginRight: '10px' }} /> Join <span className="brand-font" style={{ fontSize: '32px' }}>Vi-Notes</span></h2>
        <form className="auth-form" onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="register-email">Email</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                id="register-email"
                name="email"
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
                name="password"
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
