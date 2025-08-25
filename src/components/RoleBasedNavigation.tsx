import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  isAdmin, 
  isSponsor, 
  isUser, 
  getUserRole,
  logout 
} from '../utils/auth';

const RoleBasedNavigation: React.FC = () => {
  const location = useLocation();
  const userRole = getUserRole();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavLinkClass = (path: string) => {
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    }`;
  };

  if (!userRole) {
    return null; // Not authenticated
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and main nav */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <span className="text-xl font-bold text-blue-600">Contestlet</span>
            </Link>
            
            <div className="ml-10 flex items-baseline space-x-4">
              {/* Role-based navigation items */}
              {isAdmin() && (
                <>
                  <Link to="/admin/contests" className={getNavLinkClass('/admin/contests')}>
                    All Contests
                  </Link>
                  <Link to="/admin/users" className={getNavLinkClass('/admin/users')}>
                    User Management
                  </Link>
                  <Link to="/admin/sponsors" className={getNavLinkClass('/admin/sponsors')}>
                    Sponsor Management
                  </Link>
                  <Link to="/admin/analytics" className={getNavLinkClass('/admin/analytics')}>
                    Analytics
                  </Link>
                </>
              )}
              
              {isSponsor() && (
                <>
                  <Link to="/sponsor/contests" className={getNavLinkClass('/sponsor/contests')}>
                    My Contests
                  </Link>
                  <Link to="/sponsor/profile" className={getNavLinkClass('/sponsor/profile')}>
                    Sponsor Profile
                  </Link>
                  <Link to="/sponsor/analytics" className={getNavLinkClass('/sponsor/analytics')}>
                    Contest Analytics
                  </Link>
                </>
              )}
              
              {isUser() && (
                <>
                  <Link to="/contests" className={getNavLinkClass('/contests')}>
                    Available Contests
                  </Link>
                  <Link to="/my-entries" className={getNavLinkClass('/my-entries')}>
                    My Entries
                  </Link>
                </>
              )}
              
              {/* Universal navigation */}
              <Link to="/profile" className={getNavLinkClass('/profile')}>
                Profile
              </Link>
            </div>
          </div>

          {/* Right side - User menu and logout */}
          <div className="flex items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Role: <span className="font-medium capitalize">{userRole}</span>
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default RoleBasedNavigation;
