
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
import ReportSettingsPage from "@/components/pages/ReportSettingsPage"
import { useState, useEffect } from 'react';
import DefaultPage from "@/components/pages/DefaultPage"

type Page = 'menu' | 'my-shifts' | 'shifts' | 'reports' | 'login' | 'receipes' | 'shift-management' | 'users' | 'default';

export default function Home() {
  const [activePage, setActivePage] = useState<Page>('default');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [myShiftsKey, setMyShiftsKey] = useState(0);

  
  // Use centralized auth state from AuthContext
  const { user, role, fullName, loading, signOut } = useAuth();
  useEffect(() => {
    if (!loading && user && activePage === 'login') {
      // Role-based redirect after login
      if (role === 'manager') {
        setActivePage('shift-management');
      } else {
        setActivePage('my-shifts');
      }
    }
    if (!loading && user && activePage === 'default') {
      // Role-based redirect on initial load when already authenticated
      if (role === 'manager') {
        setActivePage('shift-management');
      } else {
        setActivePage('my-shifts');
      }
    }
  }, [user, loading, activePage, role]);
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
    if ((page === 'shifts' || page === 'receipes' || page === 'my-shifts') && !isAuthenticated) {
      setActivePage('login');
    } else if (page === 'reports' && role !== 'manager') {
      setActivePage('login');
    } else {
      if (page === 'my-shifts') setMyShiftsKey((k) => k + 1);
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
        if (!isAuthenticated) return <LoginPage />;
        return <ShiftsPage />;
      case "my-shifts":
        if (!isAuthenticated) return <LoginPage />;
        return <MyShifts key={myShiftsKey} />;
      case 'receipes':
        if (!isAuthenticated) return <LoginPage />;
        return <UnderConstructionPage />;
      case 'reports':
        if (!isAuthenticated) return <LoginPage />;
        if (role !== 'manager') return <LoginPage />;
        return <ReportSettingsPage />;
      case 'shift-management':
        return <ShiftManagmentPage />;
      case 'users':
        return <UsersPage />;
      default:
        return <DefaultPage />;
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
              src="https://gsjzfetxqdvphqxxmflh.supabase.co/storage/v1/object/sign/image/logo-green-bg%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YTU4MGFjOC1hYmRjLTRhYmMtYWZjOS1mYzE4ZmIyMjJmZTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9sb2dvLWdyZWVuLWJnICgxKS5wbmciLCJpYXQiOjE3NjgwMDAxMjQsImV4cCI6MTc5OTUzNjEyNH0.4TrmkZ_G-g39WM7AQ_WZZf7Eddd6EAWXxi4_49os8uc" 
              alt="חדר אוכל"
              className="logo-image"
            />
            <h1 className="app-title">חדר אוכל</h1>
          </div>
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
              {role === 'manager' && (
                  <>
                  <button
                  className={`nav-button ${activePage === 'reports' ? 'active' : ''}` }
                  onClick={() => handlePageChange('reports')}
                >
                  דוחות
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
