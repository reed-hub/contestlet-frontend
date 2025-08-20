import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken, clearAllTokens } from '../utils/auth';
import Toast from '../components/Toast';

interface ContestFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  prize_description: string;
  prize_value: string;
  eligibility_text: string;
}

const NewContest: React.FC = () => {
  const [formData, setFormData] = useState<ContestFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: 'Online',
    prize_description: '',
    prize_value: '100',
    eligibility_text: 'Open to all participants. Must be 18 years or older.'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });
  const navigate = useNavigate();

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Check authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Set default dates on component mount
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(17, 0, 0, 0); // 5 PM next week

    const formatDateTime = (date: Date) => {
      return date.toISOString().slice(0, 16); // Format for datetime-local input
    };

    if (!formData.start_date || !formData.end_date) {
      setFormData(prev => ({
        ...prev,
        start_date: prev.start_date || formatDateTime(tomorrow),
        end_date: prev.end_date || formatDateTime(nextWeek)
      }));
    }
  }, [formData.start_date, formData.end_date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Basic validation
    if (!formData.name.trim()) {
      setError('Contest name is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Contest description is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.prize_description.trim()) {
      setError('Prize description is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.start_date) {
      setError('Start date is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.end_date) {
      setError('End date is required');
      setIsSubmitting(false);
      return;
    }

    // Validate prize value is a positive number
    const prizeValue = parseFloat(formData.prize_value);
    if (isNaN(prizeValue) || prizeValue <= 0) {
      setError('Prize value must be a positive number');
      setIsSubmitting(false);
      return;
    }

    // Validate dates
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (endDate <= startDate) {
      setError('End date must be after start date');
      setIsSubmitting(false);
      return;
    }

    try {
      const adminToken = getAdminToken();
      
      // Check if we have a valid admin token
      if (!adminToken) {
        setError('No admin token found. Please log in again.');
        setIsSubmitting(false);
        return;
      }
      
      // Transform data to match API format
      const apiPayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        start_time: formData.start_date,
        end_time: formData.end_date,
        location: formData.location.trim() || 'Online',
        active: true,
        prize_description: formData.prize_description.trim(),
        official_rules: {
          eligibility_text: formData.eligibility_text.trim(),
          sponsor_name: 'Contestlet',
          start_date: formData.start_date,
          end_date: formData.end_date,
          prize_value_usd: parseFloat(formData.prize_value),
          terms_url: 'https://contestlet.com/terms'
        }
      };

      console.log('Creating contest with payload:', apiPayload); // Debug log
      console.log('Using admin token:', adminToken ? `${adminToken.substring(0, 20)}...` : 'NO TOKEN'); // Debug log
      
      const response = await fetch(`${apiBaseUrl}/admin/contests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(apiPayload),
      });

      console.log('API Response status:', response.status); // Debug log
      console.log('API Response headers:', Object.fromEntries(response.headers.entries())); // Debug log

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Contest creation failed:', errorData);
        
        // Provide specific error messages based on status code
        let errorMessage = '';
        switch (response.status) {
          case 401:
            errorMessage = 'Authentication failed. Please try logging in again.';
            break;
          case 403:
            errorMessage = 'Access denied. Invalid admin token. Please contact support.';
            break;
          case 422:
            if (errorData.detail && Array.isArray(errorData.detail)) {
              const missingFields = errorData.detail.map((err: any) => err.loc?.join('.') || 'unknown').join(', ');
              errorMessage = `Validation error: Missing or invalid fields: ${missingFields}`;
            } else {
              errorMessage = 'Validation error. Please check all required fields.';
            }
            break;
          case 429:
            errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = errorData.message || errorData.detail || `HTTP error! status: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const createdContest = await response.json();
      console.log('Contest created successfully:', createdContest);

      // Show success toast
      setToast({
        type: 'success',
        message: `Contest "${formData.name}" created successfully! Redirecting...`,
        isVisible: true,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        location: 'Online',
        prize_description: '',
        prize_value: '100',
        eligibility_text: 'Open to all participants. Must be 18 years or older.'
      });

      // Redirect after showing success message
      setTimeout(() => {
        navigate('/admin/contests');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      location: 'Online',
      prize_description: '',
      prize_value: '100',
      eligibility_text: 'Open to all participants. Must be 18 years or older.'
    });
    setError(null);
    setToast({ type: 'info', message: '', isVisible: false });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
      
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Contest</h1>
            <p className="text-gray-600 mt-1">Fill in the details to create a new contest</p>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/admin/contests"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Back to Contests
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contest Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Contest Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter contest name"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter contest description"
              disabled={isSubmitting}
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Online, New York, Global"
              disabled={isSubmitting}
            />
          </div>

          {/* Prize Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prize Description */}
            <div>
              <label htmlFor="prize_description" className="block text-sm font-medium text-gray-700 mb-2">
                Prize Description *
              </label>
              <input
                type="text"
                id="prize_description"
                name="prize_description"
                required
                value={formData.prize_description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., $500 Cash Prize, Gift Card, etc."
                disabled={isSubmitting}
              />
            </div>

            {/* Prize Value */}
            <div>
              <label htmlFor="prize_value" className="block text-sm font-medium text-gray-700 mb-2">
                Prize Value (USD) *
              </label>
              <input
                type="number"
                id="prize_value"
                name="prize_value"
                required
                min="0"
                step="0.01"
                value={formData.prize_value}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="100.00"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Eligibility */}
          <div>
            <label htmlFor="eligibility_text" className="block text-sm font-medium text-gray-700 mb-2">
              Eligibility Requirements
            </label>
            <textarea
              id="eligibility_text"
              name="eligibility_text"
              rows={3}
              value={formData.eligibility_text}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter eligibility requirements and contest rules"
              disabled={isSubmitting}
            />
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="datetime-local"
                id="start_date"
                name="start_date"
                required
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="datetime-local"
                id="end_date"
                name="end_date"
                required
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Contest...
                </div>
              ) : (
                '🎯 Create Contest'
              )}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="px-4 py-2 border border-yellow-300 text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Clear Form
            </button>
            <Link
              to="/admin/contests"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ← Back to Contests
            </Link>
          </div>
        </form>

        {/* Debug Panel */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-gray-600">
              <strong>Debug Info:</strong> Admin Token: {getAdminToken() ? '✅ Present' : '❌ Missing'}
              <br />
              <span className="text-xs text-gray-500">
                Token preview: {getAdminToken() ? `${getAdminToken()?.substring(0, 20)}...` : 'None'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const token = getAdminToken();
                  console.log('Current admin token:', token);
                  console.log('Is admin authenticated:', isAdminAuthenticated());
                  alert(`Token: ${token ? 'Present' : 'Missing'}\nAuthenticated: ${isAdminAuthenticated()}\nToken: ${token || 'N/A'}`);
                }}
                className="px-3 py-1 text-xs bg-blue-200 text-blue-700 rounded hover:bg-blue-300"
              >
                Check Auth
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllTokens();
                  alert('All tokens cleared! Please log in again.');
                  navigate('/admin');
                }}
                className="px-3 py-1 text-xs bg-red-200 text-red-700 rounded hover:bg-red-300"
              >
                🗑️ Clear Tokens
              </button>
            </div>
          </div>
          <div className="text-xs text-red-600">
            ⚠️ If you see an old token like "admin_token_..." instead of "contestlet-admin-super-secret-token...", 
            click "Clear Tokens" and log in again.
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Contest Creation Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Contest will be active immediately after creation</li>
                  <li>Participants can enter using the contest ID</li>
                  <li>Start date should be in the future for scheduled contests</li>
                  <li>Prize value is used for legal compliance and display</li>
                  <li>All fields except location are required</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewContest;
