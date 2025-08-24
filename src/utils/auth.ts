// Authentication utilities for Contestlet API

const AUTH_TOKEN_KEY = 'contestlet_auth_token';
const ADMIN_TOKEN_KEY = 'contestlet_admin_token';

// Legacy admin token (deprecated in favor of OTP authentication)
// const ADMIN_BEARER_TOKEN = 'contestlet-admin-super-secret-token-change-in-production';

// Admin role verification
export const verifyAdminRole = async (token: string): Promise<boolean> => {
  try {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return userData.role === 'admin';
    }
    return false;
  } catch (error) {
    console.error('Error verifying admin role:', error);
    return false;
  }
};

export const logout = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return !!token;
};

export const isAdminAuthenticated = (): boolean => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return !!token;
};

export const getToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getAdminToken = (): string | null => {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setUserToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const setAdminToken = (token: string): void => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearUserToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('user_phone');
};

export const setUserPhone = (phone: string): void => {
  localStorage.setItem('user_phone', phone);
};

export const getUserPhone = (): string | null => {
  return localStorage.getItem('user_phone');
};

export const clearAllTokens = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem('user_phone');
  // Also clear any old token keys that might be lingering
  localStorage.removeItem('admin_auth_token');
  localStorage.removeItem('contestlet_admin_token');
  localStorage.removeItem('contestlet-admin-token');
};

// User role types
export type UserRole = 'admin' | 'sponsor' | 'user';

// User interface with role
export interface User {
  id: string;
  phone: string;
  role: UserRole;
  name?: string;
  email?: string;
  sponsor_profile?: SponsorProfile;
  created_at: string;
  updated_at: string;
}

// Sponsor profile interface
export interface SponsorProfile {
  id: string;
  user_id: string;
  company_name: string;
  website_url?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  industry?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Role-based authentication functions
export const getCurrentUser = (): User | null => {
  // For now, we'll create a mock user based on stored tokens
  // TODO: Replace with actual API call to get user profile
  const adminToken = getAdminToken();
  const userToken = getToken();
  const userPhone = getUserPhone();
  
  if (adminToken) {
    // If admin token exists, return admin user
    return {
      id: 'admin-user',
      phone: userPhone || 'admin',
      role: 'admin',
      name: 'Administrator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  if (userToken && userPhone) {
    // If user token exists, return user (default to 'user' role for now)
    // TODO: Fetch actual user role from API
    return {
      id: 'user-' + userPhone,
      phone: userPhone,
      role: 'user', // Default role, should be fetched from API
      name: 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  return null;
};

export const getUserRole = (): UserRole | null => {
  const user = getCurrentUser();
  return user?.role || null;
};

export const isAdmin = (): boolean => {
  return getUserRole() === 'admin';
};

export const isSponsor = (): boolean => {
  return getUserRole() === 'sponsor';
};

export const isUser = (): boolean => {
  return getUserRole() === 'user';
};

export const hasRole = (allowedRoles: UserRole[]): boolean => {
  const userRole = getUserRole();
  return userRole ? allowedRoles.includes(userRole) : false;
};

// Role-based access control
export const canManageContests = (): boolean => {
  return hasRole(['admin', 'sponsor']);
};

export const canManageUsers = (): boolean => {
  return hasRole(['admin']);
};

export const canManageSponsorProfiles = (): boolean => {
  return hasRole(['admin', 'sponsor']);
};

export const canEnterContests = (): boolean => {
  return hasRole(['user', 'sponsor', 'admin']);
};

// Development/testing helper functions
export const setUserRole = (role: UserRole): void => {
  // Store role in localStorage for development/testing
  // TODO: Remove this in production - roles should come from backend
  localStorage.setItem('user_role', role);
};

export const getStoredUserRole = (): UserRole | null => {
  // Get role from localStorage for development/testing
  // TODO: Remove this in production - roles should come from backend
  const storedRole = localStorage.getItem('user_role');
  return storedRole as UserRole | null;
};

// Enhanced getCurrentUser that uses stored role for testing
export const getCurrentUserWithStoredRole = (): User | null => {
  const adminToken = getAdminToken();
  const userToken = getToken();
  const userPhone = getUserPhone();
  const storedRole = getStoredUserRole();
  
  if (adminToken) {
    return {
      id: 'admin-user',
      phone: userPhone || 'admin',
      role: 'admin',
      name: 'Administrator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  if (userToken && userPhone) {
    return {
      id: 'user-' + userPhone,
      phone: userPhone,
      role: storedRole || 'user', // Use stored role if available
      name: 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  return null;
};
