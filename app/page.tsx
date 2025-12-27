
"use client"

import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SetupChecklist } from "@/components/setup-checklist"
import { ApiTester } from "@/components/api-tester"
import { UsersList } from "@/components/users-list"
import  MenuPage from "@/components/pages/MenuPage"
import UnderConstructionPage from "@/components/pages/UnderConstructionPage"
import UsersPage from "@/components/pages/UsersPage"
import ShiftsPage from "@/components/pages/ShiftsPage"
import LoginPage from "@/components/pages/LoginPage"
import MyShifts from "@/components/pages/MyShiftsPage"
import ShiftManagmentPage from "@/components/pages/ShiftManagementPage"
import { useState, useEffect } from 'react';

type Page = 'menu' | 'my-shifts' | 'shifts' | 'reports' | 'login' | 'receipes' | 'stock' | 'shift-management' | 'reports-management' | 'users' ;

export default function Home() {
  const [activePage, setActivePage] = useState<Page>('menu');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  
  // Use centralized auth state from AuthContext
  const { user, role, fullName, loading, signOut } = useAuth();
  useEffect(() => {
  if (!loading && user && activePage === 'login') {
    setActivePage('menu'); // Redirect authenticated users away from login page
  }
  }, [user, loading, activePage]);
  const isAuthenticated = !!user;
  const username = fullName || user?.email || null;
  console.log("Rendered with user:", user, "fullName:", fullName);
  // const username = user?. || user?.id || null;
  

  const handleLogout = async () => {
    await signOut();
    setActivePage('menu');
  }

  const handlePageChange = (page: Page) => {
    // Page-level quick checks (UI level only), renderPage() will do final checks 
    if ((page === 'shifts' || page === 'receipes' || page == 'my-shifts' ) && !isAuthenticated) {
      setActivePage('menu');
    } else if (page === 'reports' && !(role === 'shift-manager' || role === 'manager')) {
      setActivePage('menu');
    } else if ((page === 'stock' || page === 'shift-management' || page === 'reports-management') && role !== 'manager') {
      setActivePage('menu');
    } else {
      setActivePage(page);
    }
    setSidebarOpen(false);
  };

  const renderPage = () => {
    // Optionally show a loading UI while auth initializes
    if (loading) return <div>טוען...</div>;
   
    switch (activePage) {
      case 'menu':
        return <MenuPage />;
      case 'login':
        return <LoginPage />;
      case 'shifts':
        if (!isAuthenticated) return <MenuPage />;
        return <ShiftsPage />;
      case "my-shifts":
        if (!isAuthenticated) return <MenuPage />;
        return <MyShifts />;
      case 'receipes':
        if (!isAuthenticated) return <MenuPage />;
        return <UnderConstructionPage />;
      case 'reports':
        if (!isAuthenticated) return <MenuPage />;
        if (!(role === 'shift-manager' || role === 'manager')) return <MenuPage />; // or show 403
        return <UnderConstructionPage />;
      case 'stock':
        return <UnderConstructionPage />;
      case 'shift-management':
        return <ShiftManagmentPage />;
      case 'users':
        return <UsersPage />;
      case 'reports-management':
        if (!isAuthenticated) return <MenuPage />;
        if (role !== 'manager') return <MenuPage />;
        // Placeholder components for these pages can be created similarly to others
        return <UnderConstructionPage />;
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
                className={`nav-button ${activePage === 'my-shifts' ? 'active' : ''}`}
                onClick={() => handlePageChange('my-shifts')}
              >
                המשמרות שלי
              </button>
              <button 
                className={`nav-button ${activePage === 'shifts' ? 'active' : ''}`}
                onClick={() => handlePageChange('shifts')}
              >
                משמרות
              </button>
              <button 
                className={`nav-button ${activePage === 'receipes' ? 'active' : ''}`}
                onClick={() => handlePageChange('receipes')}
              >
              מתכונים
              </button>
              {(role === 'manager' || role === 'shift-manager') && (
                <button
                  className={`nav-button ${activePage === 'reports' ? 'active' : ''}` }
                  onClick={() => handlePageChange('reports')}
                >
                  דוחות
                </button>
              )}
              {role === 'manager' && (
                  <>
                  <button
                    className={`nav-button ${activePage === 'stock' ? 'active' : ''}` }
                    onClick={() => handlePageChange('stock')}
                  >
                    ניהול מלאי
                  </button>
                  <button
                    className={`nav-button ${activePage === 'users' ? 'active' : ''}` }
                    onClick={() => handlePageChange('users')}
                  >
                    ניהול משתמשים
                  </button>
                  <button
                    className={`nav-button ${activePage === 'shift-management' ? 'active' : ''}` }
                    onClick={() => handlePageChange('shift-management')}
                  >
                    ניהול משמרות
                  </button>
                  <button
                    className={`nav-button ${activePage === 'reports-management' ? 'active' : ''}` }
                    onClick={() => handlePageChange('reports-management')}
                  >
                    ניהול דוחות
                  </button>
                  </>
                )}
                </>
          ) : (
            <button
            className={`nav-button ${activePage === 'login' ? 'active' : ''}`}
              onClick={() => handlePageChange('login')}>
              התחבר
            </button>
          )}
        </nav>

        {/* Footer Section */}
        <footer className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div className="user-info">
                <span className="user-id">{username}</span>
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
  )
}
