import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken } from '../utils/auth';
import { 
  BackendTimezone,
  getSupportedTimezones,
  saveAdminTimezoneToBackend,
  loadAdminTimezoneFromBackend,
  getAdminTimezone, 
  setAdminTimezone, 
  isAdminTimezoneAutoDetected,
  getBrowserTimezone,
  getTimezoneDisplayName,
  formatDateInAdminTimezone
} from '../utils/timezone';
import Toast from '../components/Toast';

interface AdminProfileData {
  id: number;
  phone: string;
  role: string;
  name?: string;
  email?: string;
  created_at: string;
  updated_at?: string;
}

const AdminProfile: React.FC = () => {
  const [selectedTimezone, setSelectedTimezone] = useState(getAdminTimezone());
  const [autoDetect, setAutoDetect] = useState(isAdminTimezoneAutoDetected());
  const [supportedTimezones, setSupportedTimezones] = useState<BackendTimezone[]>([]);
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });
  const navigate = useNavigate();

  // Check authentication and load data on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }

    // Load supported timezones and admin preferences
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load admin profile from new endpoint
        await loadAdminProfile();
        
        // Load supported timezones from backend
        const timezones = await getSupportedTimezones();
        setSupportedTimezones(timezones);

        // Load admin timezone preferences from backend
        const adminToken = getAdminToken();
        if (adminToken) {
          const preferences = await loadAdminTimezoneFromBackend(adminToken);
          if (preferences) {
            setSelectedTimezone(preferences.timezone);
            setAutoDetect(preferences.autoDetect);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setToast({
          type: 'warning',
          message: 'Some data failed to load. Some features may be limited.',
          isVisible: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  // Load admin profile from new endpoint
  const loadAdminProfile = async () => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return;

      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch admin profile: ${response.status}`);
      }

      const profileData = await response.json();
      console.log('Admin profile data received:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      // Don't show error toast for profile loading - it's not critical for timezone functionality
    }
  };

  // Update timezone when auto-detect changes
  useEffect(() => {
    if (autoDetect) {
      setSelectedTimezone(getBrowserTimezone());
    }
  }, [autoDetect]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const adminToken = getAdminToken();
      let backendSaved = false;
      
      if (adminToken) {
        // Try to save to backend first
        backendSaved = await saveAdminTimezoneToBackend(selectedTimezone, autoDetect, adminToken);
      } else {
        // Fallback to localStorage only
        setAdminTimezone(selectedTimezone, autoDetect);
      }
      
      setToast({
        type: 'success',
        message: `Timezone preference saved${backendSaved ? '' : ' locally'}! All contest times will now display in ${getTimezoneDisplayName(selectedTimezone)}.`,
        isVisible: true,
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to save timezone preference. Please try again.',
        isVisible: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  // Current time for preview
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
              <p className="mt-2 text-gray-600">Manage your timezone preferences and profile settings</p>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/admin/contests"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back to Contests
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        {profile && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Phone Number:</span>
                <span className="ml-2 font-medium text-gray-900 font-mono">
                  {profile.phone || 'Not available'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Role:</span>
                <span className="ml-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Unknown'}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {profile.name || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {profile.email || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Member Since:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">User ID:</span>
                <span className="ml-2 font-medium text-gray-900 font-mono">
                  {profile.id || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timezone Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Timezone Settings</h2>
          
          {/* Auto-detect Toggle */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Automatically detect timezone from browser
              </span>
            </label>
          </div>

          {/* Manual Timezone Selection */}
          {!autoDetect && (
            <div className="mb-6">
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Select Timezone
              </label>
              <select
                id="timezone"
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="United States">
                  {supportedTimezones
                    .filter(tz => tz.timezone.startsWith('America/'))
                    .map(tz => (
                      <option key={tz.timezone} value={tz.timezone}>
                        {tz.display_name} ({tz.utc_offset})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="International">
                  {supportedTimezones
                    .filter(tz => !tz.timezone.startsWith('America/'))
                    .map(tz => (
                      <option key={tz.timezone} value={tz.timezone}>
                        {tz.display_name} ({tz.utc_offset})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Time Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">🕐 Time Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Current time in {getTimezoneDisplayName(selectedTimezone)}:</span>
                <span className="font-mono text-blue-900">
                  {formatDateInAdminTimezone(currentTime.toISOString(), selectedTimezone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Current UTC time:</span>
                <span className="font-mono text-blue-900">
                  {formatDateInAdminTimezone(currentTime.toISOString(), 'UTC')}
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-3 p-2 bg-blue-100 rounded">
                <strong>How this works:</strong> When you create or edit contests, you'll enter times in <strong>{getTimezoneDisplayName(selectedTimezone)}</strong>. 
                The system will automatically convert them to UTC for storage and display them back in your selected timezone.
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                'Save Timezone Preference'
              )}
            </button>
          </div>
        </div>

        {/* Backend Integration Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">✅ Backend API Integration Complete</h3>
              <div className="mt-2 text-sm text-green-700">
                <p className="mb-2">
                  The backend now provides full timezone support with these features:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>✅ Admin timezone preferences stored in database</li>
                  <li>✅ 18 supported timezones with current time & UTC offset info</li>
                  <li>✅ Contest creation captures timezone metadata</li>
                  <li>✅ UTC timestamps enforced for all contest times</li>
                  <li>✅ Timezone-aware API endpoints active</li>
                  <li>✅ Automatic timezone context preservation</li>
                  <li>✅ New admin profile endpoint integrated</li>
                </ul>
                <p className="mt-2 text-xs">
                  <strong>Current Status:</strong> {supportedTimezones.length > 0 
                    ? `✅ Connected to backend (${supportedTimezones.length} timezones loaded)`
                    : '⚠️ Using offline fallback data'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
};

export default AdminProfile;
