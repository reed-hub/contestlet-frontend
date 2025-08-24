import React, { useState } from 'react';
import { 
  setUserRole, 
  getStoredUserRole, 
  getCurrentUser, 
  isAdmin,
  isSponsor,
  isUser,
  hasRole,
  canManageContests,
  canManageUsers,
  canEnterContests
} from '../utils/auth';
import { useUserRole } from '../hooks/useUserRole';
import { apiClient } from '../utils/apiClient';

const RoleTester: React.FC = () => {
  const { role, isAuthenticated, refreshUserInfo, logout } = useUserRole();
  const [currentRole, setCurrentRole] = useState<string>(getStoredUserRole() || 'none');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [apiTestResult, setApiTestResult] = useState<string>('');

  const handleRoleChange = (role: string) => {
    setUserRole(role as any);
    setCurrentRole(role);
    setUserInfo(null); // Reset user info to refresh
  };

  const testPermissions = () => {
    const permissions = {
      isAdmin: isAdmin(),
      isSponsor: isSponsor(),
      isUser: isUser(),
      canManageContests: canManageContests(),
      canManageUsers: canManageUsers(),
      canEnterContests: canEnterContests(),
      hasRoleAdmin: hasRole(['admin']),
      hasRoleSponsor: hasRole(['sponsor']),
      hasRoleUser: hasRole(['user']),
      hasRoleAdminOrSponsor: hasRole(['admin', 'sponsor'])
    };
    
    setUserInfo({ ...getCurrentUser(), permissions });
  };

  const testApiConnection = async () => {
    setApiTestResult('Testing API connection...');
    try {
      // Test basic API connectivity
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/health`);
      if (response.ok) {
        setApiTestResult('✅ API connection successful!');
      } else {
        setApiTestResult(`❌ API connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      setApiTestResult(`❌ API connection error: ${error.message}`);
    }
  };

  const testRoleUpgrade = async () => {
    setApiTestResult('Testing role upgrade API...');
    try {
      // This will fail if backend isn't implemented yet, but that's expected
      await apiClient.requestSponsorUpgrade({
        target_role: 'sponsor',
        company_name: 'Test Company',
        website_url: 'https://test.com'
      });
      setApiTestResult('✅ Role upgrade API working!');
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        setApiTestResult('❌ Backend not running or CORS issue');
      } else if (error.message.includes('API Error: 404')) {
        setApiTestResult('⚠️ Backend running but role upgrade endpoint not implemented yet');
      } else {
        setApiTestResult(`⚠️ API error: ${error.message}`);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Role System Integration Tester</h2>
      
      {/* Current Authentication Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Authentication Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Authenticated:</span> 
            <span className={`ml-2 ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Current Role:</span> 
            <span className="ml-2 text-blue-600 font-medium">{role}</span>
          </div>
          <div>
            <span className="font-medium">Token Type:</span> 
            <span className="ml-2 text-gray-600">
              {localStorage.getItem('access_token') ? 'New JWT' : 
               localStorage.getItem('contestlet-admin-token') ? 'Legacy Admin' : 'None'}
            </span>
          </div>
          <div>
            <span className="font-medium">API Base URL:</span> 
            <span className="ml-2 text-gray-600">{process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}</span>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Select Role for Testing</h3>
        <div className="flex space-x-4">
          {['user', 'sponsor', 'admin'].map((roleOption) => (
            <button
              key={roleOption}
              onClick={() => handleRoleChange(roleOption)}
              className={`px-4 py-2 rounded-md font-medium ${
                currentRole === roleOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Current Role: <span className="font-medium">{currentRole}</span>
        </p>
      </div>

      {/* API Testing */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">API Integration Testing</h3>
        <div className="flex space-x-4 mb-3">
          <button
            onClick={testApiConnection}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test API Connection
          </button>
          <button
            onClick={testRoleUpgrade}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Test Role Upgrade API
          </button>
        </div>
        {apiTestResult && (
          <div className="p-3 bg-gray-100 rounded-md">
            <span className="text-sm font-medium">Result:</span> {apiTestResult}
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Test Functions</h3>
        <div className="flex space-x-4">
          <button
            onClick={refreshUserInfo}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Refresh User Info
          </button>
          <button
            onClick={testPermissions}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Test Permissions
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* User Info Display */}
      {userInfo && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">User Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700">Basic Info</h4>
              <pre className="text-sm bg-white p-2 rounded border">
                {JSON.stringify({
                  id: userInfo.id,
                  phone: userInfo.phone,
                  role: userInfo.role,
                  name: userInfo.name
                }, null, 2)}
              </pre>
            </div>
            {userInfo.permissions && (
              <div>
                <h4 className="font-medium text-gray-700">Permissions</h4>
                <pre className="text-sm bg-white p-2 rounded border">
                  {JSON.stringify(userInfo.permissions, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/login"
            className="block p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <h4 className="font-medium text-indigo-900">Universal Login</h4>
            <p className="text-sm text-indigo-700">Sign in with any role</p>
          </a>
          <a
            href="/user/dashboard"
            className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <h4 className="font-medium text-blue-900">User Dashboard</h4>
            <p className="text-sm text-blue-700">View user-specific features</p>
          </a>
          <a
            href="/sponsor/dashboard"
            className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <h4 className="font-medium text-green-900">Sponsor Dashboard</h4>
            <p className="text-sm text-green-700">View sponsor-specific features</p>
          </a>
          <a
            href="/admin/contests"
            className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <h4 className="font-medium text-purple-900">Admin Contests</h4>
            <p className="text-sm text-purple-700">View admin features</p>
          </a>
        </div>
      </div>

      {/* Development Notes */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2">Integration Status</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• ✅ Frontend role system implemented</li>
          <li>• ✅ API client created with all endpoints</li>
          <li>• ✅ JWT token handling implemented</li>
          <li>• 🔄 Backend integration in progress</li>
          <li>• 🔄 Role upgrade workflow pending backend</li>
          <li>• 🔄 Real API endpoints pending backend</li>
        </ul>
      </div>
    </div>
  );
};

export default RoleTester;
