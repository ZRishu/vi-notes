import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Editor from './components/Editor';
import Login from './components/Login';
import Register from './components/Register';
import { Moon, Sun, LogOut, ShieldCheck } from 'lucide-react';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const [theme, setTheme] = useState('dark');
  const [docTitle, setDocTitle] = useState('Untitled Document');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <Router>
      <div className="App">
        <header>
          <div className="header-left">
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', marginRight: '8px' }}>
              <div className="doc-icon">
                <ShieldCheck size={20} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Vi-Notes</span>
            </Link>
            
            <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)', margin: '0 8px' }}></div>
            
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
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-primary">Sign In</button>
              </Link>
            )}
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Editor />
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

