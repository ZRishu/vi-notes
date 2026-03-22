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

  const handleAuthSuccess = (isNewUser: boolean) => {
    setIsAuthModalOpen(false);
    setAuthModalMessage(null);
    
    const draft = localStorage.getItem(LOCAL_DRAFT_KEY);
    const hasContent = draft && JSON.parse(draft).content?.trim().length > 0;

    if (hasContent && location.pathname === '/') {
      window.location.reload(); 
    } else {
      navigate('/');
    }
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
            <button className="btn-primary" onClick={() => { setAuthModalMessage(null); setIsAuthModalOpen(true); }}><LogIn size={16} /> Sign In</button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<HomeRoute docTitle={docTitle} setDocTitle={setDocTitle} onAuthRequired={(msg) => { setAuthModalMessage(msg || null); setIsAuthModalOpen(true); }} />} />
          <Route path="/documents/:id" element={<ProtectedRoute onAuthRequired={() => { setAuthModalMessage('Authentication required to access this document'); setIsAuthModalOpen(true); }}><DocumentEditorRoute docTitle={docTitle} setDocTitle={setDocTitle} /></ProtectedRoute>} />
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