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

const AdminProfile: React.FC = () => {
  const [selectedTimezone, setSelectedTimezone] = useState(getAdminTimezone());
  const [autoDetect, setAutoDetect] = useState(isAdminTimezoneAutoDetected());
  const [supportedTimezones, setSupportedTimezones] = useState<BackendTimezone[]>([]);
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
        console.error('Failed to load timezone data:', error);
        setToast({
          type: 'warning',
          message: 'Using offline timezone data. Some features may be limited.',
          isVisible: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

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

  const currentTime = new Date().toISOString();
  const browserTimezone = getBrowserTimezone();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Toast */}
      {toast.isVisible && (
        <Toast
          type={toast.type}
          message={toast.message}
          isVisible={toast.isVisible}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
      )}

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Profile</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your admin preferences and settings</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              to="/admin/contests"
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              Back to Contests
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Timezone Settings */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">🕐 Timezone Settings</h2>
          <p className="text-sm text-gray-600">
            Set your preferred timezone for contest scheduling and viewing. All contest start/end times will be displayed and entered in your selected timezone.
          </p>
        </div>

        <div className="space-y-6">
          {/* Auto-detect Option */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="auto-detect"
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="auto-detect" className="font-medium text-gray-700">
                Auto-detect timezone from browser
              </label>
              <p className="text-gray-500">
                Automatically use your browser's detected timezone: <strong>{getTimezoneDisplayName(browserTimezone)}</strong>
              </p>
            </div>
          </div>

          {/* Manual Timezone Selection */}
          {!autoDetect && (
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Select Timezone
              </label>
              {isLoading ? (
                <div className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                  Loading timezones...
                </div>
              ) : (
                <select
                  id="timezone"
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
              )}
            </div>
          )}

          {/* Time Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">🕐 Time Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Current time in {getTimezoneDisplayName(selectedTimezone)}:</span>
                <span className="font-mono text-blue-900">
                  {formatDateInAdminTimezone(currentTime, selectedTimezone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Current UTC time:</span>
                <span className="font-mono text-blue-900">
                  {formatDateInAdminTimezone(currentTime, 'UTC')}
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
  );
};

export default AdminProfile;
