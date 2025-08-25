import { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

export type UserRole = 'admin' | 'sponsor' | 'user';

export interface UserInfo {
  id: string;
  phone: string;
  role: UserRole;
  isAuthenticated: boolean;
  name?: string;
  email?: string;
  sponsor_profile?: any;
  refreshUserInfo: () => void;
  logout: () => void;
}

// JWT token decoder (simple implementation)
function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

export function useUserRole(): UserInfo {
  const [userInfo, setUserInfo] = useState<Omit<UserInfo, 'refreshUserInfo' | 'logout'>>({
    id: '',
    phone: '',
    role: 'user',
    isAuthenticated: false
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    // Check for new access token first
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      try {
        // Simple JWT decode (payload only)
        const base64Url = accessToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        
        if (decoded && decoded.role) {
          setUserInfo({
            id: decoded.sub || decoded.user_id || 'unknown',
            phone: decoded.phone || '',
            role: decoded.role,
            isAuthenticated: true,
            name: decoded.name,
            email: decoded.email
          });
          return;
        }
      } catch (error) {
        console.error('Error decoding access token:', error);
      }
    }

    // Fallback to legacy admin token
    const adminToken = localStorage.getItem('contestlet-admin-token');
    if (adminToken) {
      setUserInfo({
        id: 'admin-user',
        phone: 'admin',
        role: 'admin',
        isAuthenticated: true,
        name: 'Administrator'
      });
      return;
    }

    // No valid token found
    setUserInfo({
      id: '',
      phone: '',
      role: 'user',
      isAuthenticated: false
    });
  };

  const refreshUserInfo = () => {
    checkAuthentication();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('contestlet-admin-token');
    setUserInfo({
      id: '',
      phone: '',
      role: 'user',
      isAuthenticated: false
    });
    window.location.href = '/';
  };

  return {
    ...userInfo,
    refreshUserInfo,
    logout
  };
}
