import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import Editor from './components/Editor';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import { Moon, Sun, LogOut, LogIn } from 'lucide-react';
import { hasValidAuthToken } from './api';
import './App.css';

const LOCAL_TITLE_KEY = 'vi-notes-document-title';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return hasValidAuthToken() ? <>{children}</> : <Navigate to="/login" replace />;
};

const HomeRoute = ({ docTitle, setDocTitle }: { docTitle: string; setDocTitle: React.Dispatch<React.SetStateAction<string>> }) => {
  if (hasValidAuthToken()) {
    return <Dashboard />;
  }
  return <Editor docTitle={docTitle} setDocTitle={setDocTitle} isAuthenticated={false} />;
};

const DocumentEditorRoute = ({ docTitle, setDocTitle }: { docTitle: string; setDocTitle: React.Dispatch<React.SetStateAction<string>> }) => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldAnalyzeOnLoad = searchParams.get('analyze') === '1';

  useEffect(() => {
    if (!shouldAnalyzeOnLoad) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('analyze');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, shouldAnalyzeOnLoad]);

  return (
    <Editor
      docTitle={docTitle}
      setDocTitle={setDocTitle}
      isAuthenticated={true}
      documentId={id ?? null}
      autoRunAnalysis={shouldAnalyzeOnLoad}
    />
  );
};

const AppShell = () => {
  const location = useLocation();
  const [isCompatibleScreen, setIsCompatibleScreen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768
  );
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

  useEffect(() => {
    const handleResize = () => {
      setIsCompatibleScreen(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/';
  };

  const isLoggedIn = hasValidAuthToken();
  const isEditorRoute = location.pathname === '/' ? !isLoggedIn : location.pathname.startsWith('/documents/');

  if (!isCompatibleScreen) {
    return (
      <div className="compatibility-screen">
        <div className="compatibility-card">
          <div className="doc-icon">
            <img src="/logo.svg" alt="Vi-Notes" width="22" height="22" />
          </div>
          <h1>Screen Size Not Supported</h1>
          <p>
            This editor is designed for larger screens. A minimum width of 768 pixels is required
            to use <span className="brand-font">Vi-Notes</span> reliably.
          </p>
          <p>
            Open the site on a tablet in landscape mode, laptop, or desktop browser to continue
            editing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <div className="header-left">
          <Link to="/" className="brand-link">
            <div className="doc-icon">
              <img src="/logo.svg" alt="Vi-Notes" width="24" height="24" />
            </div>
            <span className="brand-title brand-font">Vi-Notes</span>
          </Link>

          {isEditorRoute && (
            <>
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
            </>
          )}
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
          <Route path="/" element={<HomeRoute docTitle={docTitle} setDocTitle={setDocTitle} />} />
          <Route path="/documents/:id" element={<ProtectedRoute><DocumentEditorRoute docTitle={docTitle} setDocTitle={setDocTitle} /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
