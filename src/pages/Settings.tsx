import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isAdmin, isSponsor, isUser } from '../utils/auth';
import Toast from '../components/Toast';

interface UserProfile {
  id: number;
  phone: string;
  role: string;
  name?: string;
  email?: string;
  company_name?: string;
  website?: string;
  bio?: string;
  created_at: string;
  updated_at?: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_name: '',
    website: '',
    bio: ''
  });

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Check authentication on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        throw new Error('No access token found. Please log in again.');
      }

      // Determine which endpoint to use based on user role
      let endpoint = '';
      if (isAdmin()) {
        endpoint = '/admin/profile';
      } else if (isSponsor()) {
        endpoint = '/sponsor/profile';
      } else if (isUser()) {
        endpoint = '/user/profile';
      } else {
        throw new Error('Unknown user role');
      }
      
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const profileData = await response.json();
      console.log('Profile data received:', profileData);
      setProfile(profileData);
      
      // Populate form with existing data
      setFormData({
        name: profileData.name || '',
        email: profileData.email || '',
        company_name: profileData.company_name || '',
        website: profileData.website || '',
        bio: profileData.bio || ''
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch profile',
        isVisible: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        throw new Error('No access token found. Please log in again.');
      }

      // Determine which endpoint to use based on user role
      let endpoint = '';
      if (isAdmin()) {
        endpoint = '/admin/profile';
      } else if (isSponsor()) {
        endpoint = '/sponsor/profile';
      } else if (isUser()) {
        endpoint = '/user/profile';
      } else {
        throw new Error('Unknown user role');
      }
      
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setToast({
          type: 'success',
          message: 'Profile updated successfully!',
          isVisible: true
        });
        
        // Refresh profile data
        await fetchProfile();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to update profile: ${response.status}`);
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update profile',
        isVisible: true
      });
    } finally {
      setSaving(false);
    }
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
            <p className="text-gray-600 mb-6">Unable to load your profile information.</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Settings Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-gray-200">
            <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
              Profile Settings
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Account Security
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Notifications
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Privacy
            </button>
          </nav>
        </div>

        {/* Profile Settings Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
            <p className="mt-1 text-sm text-gray-600">
              Update your personal information and profile details
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
            </div>

            {/* Company Information (for sponsors) */}
            {isSponsor() && (
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your company name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                value={formData.bio}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us a bit about yourself..."
              />
            </div>

            {/* Read-only Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Phone Number:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {profile.phone ? (
                      <span className="font-mono">{profile.phone}</span>
                    ) : (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Role:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 
                       (() => {
                         if (isAdmin()) return 'Admin';
                         if (isSponsor()) return 'Sponsor';
                         if (isUser()) return 'User';
                         return 'Unknown';
                       })()}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Member Since:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {profile.created_at ? (
                      new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    ) : (
                      <span className="text-gray-400 italic">Unknown</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">User ID:</span>
                  <span className="ml-2 font-medium text-gray-900 font-mono">
                    {profile.id || <span className="text-gray-400 italic">Unknown</span>}
                  </span>
                </div>
              </div>
              
              {/* Additional Account Details */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account Status:</span>
                    <span className="ml-2 font-medium text-green-600">
                      <span className="inline-flex items-center">
                        <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Active
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {profile.updated_at ? (
                        new Date(profile.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="text-gray-400 italic">Never</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Coming Soon Sections */}
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Manage password, two-factor authentication, and login sessions
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Control how and when you receive notifications
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Manage data sharing and privacy preferences
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default Settings;
