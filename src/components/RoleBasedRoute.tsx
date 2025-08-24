import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasRole, getCurrentUser } from '../utils/auth';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/login' 
}) => {
  const location = useLocation();
  const user = getCurrentUser();

  // Check if user is authenticated
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (!hasRole(allowedRoles as any)) {
    // Redirect to appropriate dashboard based on user's actual role
    const userRole = user.role;
    let dashboardPath = '/login';
    
    switch (userRole) {
      case 'admin':
        dashboardPath = '/admin/contests';
        break;
      case 'sponsor':
        dashboardPath = '/sponsor/dashboard';
        break;
      case 'user':
        dashboardPath = '/user/dashboard';
        break;
      default:
        dashboardPath = '/login';
    }
    
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
