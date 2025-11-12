import { useState, useEffect } from 'react';
import MenuPage from './pages/MenuPage';
import ShiftsPage from './pages/ShiftsPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';

type Page = 'menu' | 'shifts' | 'reports' | 'login';

function App() {
  const [activePage, setActivePage] = useState<Page>('menu');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Check for existing authentication on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedUsername = localStorage.getItem('username');
    if (storedAuth === 'true' && storedUsername) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
  }, []);

  const handleLogin = (user: string) => {
    setIsAuthenticated(true);
    setUsername(user);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', user);
    // Redirect to shifts page after successful login
    setActivePage('shifts');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    // Redirect to menu page after logout
    setActivePage('menu');
  };

  const handlePageChange = (page: Page) => {
    // If trying to access protected page without authentication, redirect to menu
    if ((page === 'shifts' || page === 'reports') && !isAuthenticated) {
      setActivePage('menu');
    } else {
      setActivePage(page);
    }
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'menu':
        return <MenuPage />;
      case 'login':
        return <LoginPage onLogin={handleLogin} />;
      case 'shifts':
        // Only show shifts if authenticated, otherwise redirect to menu
        if (!isAuthenticated) {
          return <MenuPage />;
        }
        return <ShiftsPage />;
      case 'reports':
        // Only show reports if authenticated, otherwise redirect to menu
        if (!isAuthenticated) {
          return <MenuPage />;
        }
        return <ReportsPage />;
      default:
        return <MenuPage />;
    }
  };

  return (
    <div className="app-container" dir="rtl">
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Right Sidebar Menu */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Header Section */}
        <header className="sidebar-header">
          <div>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68eac3828de1bc1e5375b02f/5d877b84f_image.png" 
              alt="חדר אוכל"
              className="logo-image"
            />
            <h1 className="app-title">חדר אוכל</h1>
          </div>
          <h3 className="app-subtitle">הפאב הקהילתי של מושב לכיש</h3>
        </header>

        {/* Main Navigation Section */}
        <nav className="sidebar-nav">
          <button 
            className={`nav-button ${activePage === 'menu' ? 'active' : ''}`}
            onClick={() => handlePageChange('menu')}
          >
            תפריט
          </button>
          {isAuthenticated ? (
            <>
              <button 
                className={`nav-button ${activePage === 'shifts' ? 'active' : ''}`}
                onClick={() => handlePageChange('shifts')}
              >
                משמרות
              </button>
              <button 
                className={`nav-button ${activePage === 'reports' ? 'active' : ''}`}
                onClick={() => handlePageChange('reports')}
              >
                דוחות
              </button>
            </>
          ) : (
            <button 
              className={`nav-button ${activePage === 'login' ? 'active' : ''}`}
              onClick={() => handlePageChange('login')}
            >
              התחבר
            </button>
          )}
        </nav>

        {/* Footer Section */}
        <footer className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div className="user-info">
                <span className="user-id">משתמש: {username}</span>
              </div>
              <a href="#" className="logout-link" onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}>
                התנתק
              </a>
            </>
          ) : (
            <div className="user-info">
              <span className="user-id">אורח</span>
            </div>
          )}
        </footer>
      </aside>
      
      {/* Main Content Area - Left Side */}
      <main className="main-content">
        <div className="content-wrapper">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;

