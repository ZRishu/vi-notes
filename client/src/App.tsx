import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import { Moon, Sun, LogOut, LogIn, LayoutDashboard, Save, Trash2 } from 'lucide-react';
import { hasValidAuthToken } from './api';
import './App.css';

const LOCAL_TITLE_KEY = 'vi-notes-document-title';
const LOCAL_DRAFT_KEY = 'vi-notes-editor-draft';

interface EditorActions {
  save: () => void;
  delete: () => void;
  saveStatus: string;
}

const ProtectedRoute = ({ children, onAuthRequired }: { children: React.ReactNode, onAuthRequired: (msg?: string) => void }) => {
  const authed = hasValidAuthToken();
  useEffect(() => {
    if (!authed) onAuthRequired();
  }, [authed, onAuthRequired]);
  
  return authed ? <>{children}</> : null;
};

const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | null>(null);
  const [editorActions, setEditorActions] = useState<EditorActions | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(hasValidAuthToken());

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

  // Update authentication state on route changes
  useEffect(() => {
    setIsAuthenticated(hasValidAuthToken());
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleGoToDashboard = () => {
    setEditorActions(null);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  const handleAuthSuccess = (_isNewUser: boolean) => {
    setIsAuthModalOpen(false);
    setAuthModalMessage(null);
    setIsAuthenticated(true);
    
    const draft = localStorage.getItem(LOCAL_DRAFT_KEY);
    const hasContent = draft && JSON.parse(draft).content?.trim().length > 0;

    if (hasContent && location.pathname === '/') {
      window.location.reload(); 
    } else {
      navigate('/');
    }
  };

  const isEditorRoute = location.pathname === '/' ? !isAuthenticated : location.pathname.startsWith('/documents/');
  const routeViewKey = `${location.pathname}:${location.search}:${isAuthenticated ? 'auth' : 'guest'}`;

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
          {isAuthenticated && isEditorRoute ? (
            <button type="button" className="brand-link brand-link-button" onClick={handleGoToDashboard}>
              <div className="doc-icon">
                <img src="/logo.svg" alt="Vi-Notes" width="24" height="24" />
              </div>
              <span className="brand-title brand-font">Vi-Notes</span>
            </button>
          ) : (
            <Link to="/" className="brand-link">
              <div className="doc-icon">
                <img src="/logo.svg" alt="Vi-Notes" width="24" height="24" />
              </div>
              <span className="brand-title brand-font">Vi-Notes</span>
            </Link>
          )}

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
          {isAuthenticated && isEditorRoute && (
            <div className="header-actions">
              <button
                type="button"
                className="header-action-btn"
                title="Go back to Dashboard"
                onClick={handleGoToDashboard}
              >
                <LayoutDashboard size={18} />
                <span className="header-action-label">Dashboard</span>
              </button>
              {editorActions && (
                <>
                  <button 
                    className="header-action-btn" 
                    onClick={editorActions.save} 
                    title="Save current document"
                    disabled={editorActions.saveStatus === 'saving'}
                  >
                    <Save size={18} className={editorActions.saveStatus === 'saved' ? 'text-success' : ''} />
                    <span className="header-action-label">
                      {editorActions.saveStatus === 'saved' ? 'Saved' : editorActions.saveStatus === 'saving' ? 'Saving...' : 'Save'}
                    </span>
                  </button>
                  <button 
                    className="header-action-btn danger-hover" 
                    onClick={editorActions.delete} 
                    title="Delete current document"
                  >
                    <Trash2 size={18} />
                    <span className="header-action-label">Delete</span>
                  </button>
                </>
              )}
            </div>
          )}
          <button className="btn-icon theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {isAuthenticated ? (
            !isEditorRoute && (
              <button className="btn-icon" onClick={handleLogout} aria-label="Logout" style={{ color: 'var(--danger-color)' }}>
                <LogOut size={20} />
              </button>
            )
          ) : (
            <button className="btn-primary" onClick={() => { setAuthModalMessage(null); setIsAuthModalOpen(true); }}><LogIn size={16} /> Sign In</button>
          )}
        </div>
      </header>

      <main key={routeViewKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Routes location={location}>
          <Route path="/" element={
            isAuthenticated ? (
              <Dashboard key="dashboard" />
            ) : (
              <Editor 
                key="guest-editor"
                docTitle={docTitle} 
                setDocTitle={setDocTitle} 
                isAuthenticated={false} 
                onAuthRequired={(msg) => { setAuthModalMessage(msg || 'Please sign in to continue'); setIsAuthModalOpen(true); }} 
                onActionsReady={setEditorActions} 
              />
            )
          } />
          <Route path="/documents/:id" element={
            <ProtectedRoute onAuthRequired={() => { setAuthModalMessage('Authentication required to access this document'); setIsAuthModalOpen(true); }}>
              <EditorWrapper docTitle={docTitle} setDocTitle={setDocTitle} onActionsReady={setEditorActions} />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess}
        message={authModalMessage}
      />
    </div>
  );
};

const EditorWrapper = ({ docTitle, setDocTitle, onActionsReady }: { 
  docTitle: string; 
  setDocTitle: React.Dispatch<React.SetStateAction<string>>,
  onActionsReady: (actions: EditorActions | null) => void
}) => {
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
      key={`editor-${id}`}
      docTitle={docTitle}
      setDocTitle={setDocTitle}
      isAuthenticated={true}
      documentId={id ?? null}
      autoRunAnalysis={shouldAnalyzeOnLoad}
      onActionsReady={onActionsReady}
    />
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
