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

const RoleTester: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<string>(getStoredUserRole() || 'none');
  const [userInfo, setUserInfo] = useState<any>(null);

  const handleRoleChange = (role: string) => {
    setUserRole(role as any);
    setCurrentRole(role);
    setUserInfo(null); // Reset user info to refresh
  };

  const refreshUserInfo = () => {
    const user = getCurrentUser();
    setUserInfo(user);
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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Role System Tester</h2>
      
      {/* Role Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Select Role for Testing</h3>
        <div className="flex space-x-4">
          {['user', 'sponsor', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              className={`px-4 py-2 rounded-md font-medium ${
                currentRole === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Current Role: <span className="font-medium">{currentRole}</span>
        </p>
      </div>

      {/* Test Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Test Functions</h3>
        <div className="flex space-x-4">
          <button
            onClick={refreshUserInfo}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Get Current User
          </button>
          <button
            onClick={testPermissions}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Test Permissions
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <h4 className="font-medium text-yellow-900 mb-2">Development Notes</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• This component is for development/testing only</li>
          <li>• Roles are stored in localStorage for now</li>
          <li>• In production, roles will come from backend API</li>
          <li>• Use this to test role-based routing and permissions</li>
        </ul>
      </div>
    </div>
  );
};

export default RoleTester;
