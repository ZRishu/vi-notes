import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Editor from './components/Editor';
import Login from './components/Login';
import Register from './components/Register';
import { Moon, Sun, LogOut, ShieldCheck, LogIn } from 'lucide-react';
import { hasValidAuthToken } from './api';
import './App.css';

const LOCAL_TITLE_KEY = 'vi-notes-document-title';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = hasValidAuthToken();
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [docTitle, setDocTitle] = useState(() => localStorage.getItem(LOCAL_TITLE_KEY) || 'Untitled Document');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LOCAL_TITLE_KEY, docTitle);
  }, [docTitle]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const isLoggedIn = hasValidAuthToken();

  return (
    <Router>
      <div className="App">
        <header>
          <div className="header-left">
            <Link to="/" className="brand-link">
              <div className="doc-icon">
                <ShieldCheck size={20} />
              </div>
              <span className="brand-title">Vi-Notes</span>
            </Link>
            
            <div className="header-divider"></div>
            
            <div className="title-input-wrapper" data-replicated-value={docTitle}>
              <input 
                type="text" 
                className="header-doc-title" 
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Document Title"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="header-right">
            <button className="btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {isLoggedIn ? (
              <button className="btn-icon" onClick={handleLogout} aria-label="Logout" style={{ color: 'var(--danger-color)' }}>
                <LogOut size={20} />
              </button>
            ) : (
              <Link to="/login" className="header-auth-link">
                <button className="btn-primary"><LogIn size={16} /> Sign In</button>
              </Link>
            )}
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Editor docTitle={docTitle} setDocTitle={setDocTitle} />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
