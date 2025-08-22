import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { logout, isAdminAuthenticated } from '../utils/auth';
import ApiHealthStatus from './ApiHealthStatus';

const Layout: React.FC = () => {
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (adminDropdownOpen && !target.closest('.admin-dropdown')) {
        setAdminDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [adminDropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/admin');
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
                {/* Admin Dropdown */}
                {isAdminAuthenticated() ? (
                  <div className="relative admin-dropdown">
                    <button
                      onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                    >
                      👤 Admin
                      <svg
                        className={`ml-1 h-3 w-3 transform transition-transform ${
                          adminDropdownOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {adminDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          <Link
                            to="/admin/contests"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setAdminDropdownOpen(false)}
                          >
                            <span className="mr-3">🏆</span>
                            Contest Management
                          </Link>
                          <Link
                            to="/admin/notifications"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setAdminDropdownOpen(false)}
                          >
                            <span className="mr-3">📧</span>
                            SMS Logs
                          </Link>
                          <Link
                            to="/admin/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setAdminDropdownOpen(false)}
                          >
                            <span className="mr-3">⚙️</span>
                            Profile
                          </Link>
                          <div className="border-t border-gray-100"></div>
                          <button
                            onClick={() => {
                              setAdminDropdownOpen(false);
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
                    to="/admin"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Admin Login
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
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
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
              </button>
            </div>
          </div>
        </div>
      </nav>

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
