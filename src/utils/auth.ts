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
