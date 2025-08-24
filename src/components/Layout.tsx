import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { logout, getUserRole, isAdmin, isSponsor, isUser } from '../utils/auth';
import ApiHealthStatus from './ApiHealthStatus';

const Layout: React.FC = () => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = getUserRole();

  // Debug logging
  useEffect(() => {
    console.log('🔍 Layout Debug:', {
      userRole,
      isAdmin: isAdmin(),
      isSponsor: isSponsor(),
      isUser: isUser(),
      accessToken: localStorage.getItem('access_token') ? 'Present' : 'Missing',
      adminToken: localStorage.getItem('contestlet-admin-token') ? 'Present' : 'Missing'
    });
  }, [userRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (userDropdownOpen && !target.closest('.user-dropdown')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close user dropdown when route changes
  useEffect(() => {
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                Contestlet
              </Link>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Home
                </Link>
                
                {/* Role-based Navigation */}
                {userRole ? (
                  <div className="relative user-dropdown">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                    >
                      👤 {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      <svg
                        className={`ml-1 h-3 w-3 transform transition-transform ${
                          userDropdownOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          {/* Admin-specific links */}
                          {isAdmin() && (
                            <>
                              <Link
                                to="/admin/contests"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <span className="mr-3">🏆</span>
                                Contest Management
                              </Link>
                              <Link
                                to="/admin/notifications"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <span className="mr-3">📧</span>
                                SMS Logs
                              </Link>
                            </>
                          )}
                          
                          {/* Sponsor-specific links */}
                          {isSponsor() && (
                            <>
                                                    <Link
                        to="/sponsor/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <span className="mr-3">🏢</span>
                        Dashboard
                      </Link>
                              <Link
                                to="/sponsor/contests"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <span className="mr-3">🏆</span>
                                My Contests
                              </Link>
                            </>
                          )}
                          
                          {/* User-specific links */}
                          {isUser() && (
                            <>
                              <Link
                                to="/user/dashboard"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <span className="mr-3">🏠</span>
                                User Dashboard
                              </Link>
                              <Link
                                to="/contests"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <span className="mr-3">🏆</span>
                                Available Contests
                              </Link>
                            </>
                          )}
                          
                          {/* Universal links */}
                          <Link
                            to="/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <span className="mr-3">⚙️</span>
                            Profile
                          </Link>
                          
                          <div className="border-t border-gray-100"></div>
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <span className="mr-3">🚪</span>
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="bg-gray-900 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">{mobileMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
                {mobileMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div className="md:hidden fixed inset-y-0 right-0 w-64 bg-gray-900 z-50" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 h-full overflow-y-auto">
              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700">
                <h3 className="text-white text-lg font-medium">Menu</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Link
                to="/"
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                🏠 Home
              </Link>
              {userRole ? (
                <>
                  {isAdmin() && (
                    <>
                      <Link
                        to="/admin/contests"
                        className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        🏆 Contest Management
                      </Link>
                      <Link
                        to="/admin/notifications"
                        className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        📧 SMS Logs
                      </Link>
                    </>
                  )}
                  {isSponsor() && (
                    <>
                                             <Link
                         to="/sponsor/dashboard"
                         className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                         onClick={() => setMobileMenuOpen(false)}
                       >
                         🏢 Dashboard
                       </Link>
                      <Link
                        to="/sponsor/contests"
                        className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        🏆 My Contests
                      </Link>
                    </>
                  )}
                  {isUser() && (
                    <>
                      <Link
                        to="/user/dashboard"
                        className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        🏠 User Dashboard
                      </Link>
                      <Link
                        to="/contests"
                        className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        🏆 Available Contests
                      </Link>
                    </>
                  )}
                  <Link
                    to="/profile"
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ⚙️ Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="text-gray-300 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🔐 Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-1">
        <div className="px-4 py-6 sm:px-0">
          <Outlet />
        </div>
      </main>

      {/* API Health Status */}
      <ApiHealthStatus />
    </div>
  );
};

export default Layout;
