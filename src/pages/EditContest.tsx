import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken } from '../utils/auth';
import { datetimeLocalToUTC, utcToDatetimeLocal, getAdminTimezone, getTimezoneDisplayName, getTimezoneAbbreviation } from '../utils/timezone';
import { deleteContest } from '../utils/adminApi';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';

interface ContestFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  prize_description: string;
  prize_value: string;
  eligibility_text: string;
  active: boolean;
}

interface Contest {
  id: number;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  prize_description: string;
  active: boolean;
  created_at: string;
  entry_count: number;
  official_rules?: {
    eligibility_text: string;
    sponsor_name: string;
    start_date: string;
    end_date: string;
    prize_value_usd: number;
    terms_url: string;
  };
}

const EditContest: React.FC = () => {
  const { contest_id } = useParams<{ contest_id: string }>();
  const [contest, setContest] = useState<Contest | null>(null);
  const [formData, setFormData] = useState<ContestFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    prize_description: '',
    prize_value: '',
    eligibility_text: '',
    active: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });
  
  // Delete contest state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const navigate = useNavigate();

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Check authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Fetch contest data
  useEffect(() => {
    if (!contest_id) {
      navigate('/admin/contests');
      return;
    }

    const fetchContest = async () => {
      try {
        setIsLoading(true);
        const adminToken = getAdminToken();
        
        if (!adminToken) {
          navigate('/admin');
          return;
        }

        // Fetch all contests to find the specific one
        const response = await fetch(`${apiBaseUrl}/admin/contests`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch contests: ${response.status}`);
        }

        const contests = await response.json();
        const foundContest = contests.find((c: Contest) => c.id.toString() === contest_id);
        
        if (!foundContest) {
          throw new Error('Contest not found');
        }

        setContest(foundContest);
        
        // Convert contest data to form format using admin's timezone
        // Convert UTC times from backend to admin's timezone for display
        const adminTimezone = getAdminTimezone();
        
        setFormData({
          name: foundContest.name,
          description: foundContest.description,
          start_date: utcToDatetimeLocal(foundContest.start_time, adminTimezone),
          end_date: utcToDatetimeLocal(foundContest.end_time, adminTimezone),
          location: foundContest.location,
          prize_description: foundContest.prize_description,
          prize_value: foundContest.official_rules?.prize_value_usd?.toString() || '100',
          eligibility_text: foundContest.official_rules?.eligibility_text || 'Open to all participants. Must be 18 years or older.',
          active: foundContest.active
        });

      } catch (err) {
        console.error('Error fetching contest:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch contest');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContest();
  }, [contest_id, apiBaseUrl, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Contest name is required';
    if (!formData.description.trim()) return 'Description is required';
    if (!formData.start_date) return 'Start date is required';
    if (!formData.end_date) return 'End date is required';
    if (!formData.location.trim()) return 'Location is required';
    if (!formData.prize_description.trim()) return 'Prize description is required';
    
    const prizeValue = parseFloat(formData.prize_value);
    if (isNaN(prizeValue) || prizeValue <= 0) return 'Prize value must be a positive number';
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (endDate <= startDate) return 'End date must be after start date';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const adminToken = getAdminToken();
      
      if (!adminToken) {
        navigate('/admin');
        return;
      }

      // Transform form data to API format with timezone conversion
      const adminTimezone = getAdminTimezone();
      
      console.log('=== CONTEST UPDATE DEBUG ===');
      console.log('Admin timezone:', adminTimezone);
      console.log('Form start_date (user input):', formData.start_date);
      console.log('Form end_date (user input):', formData.end_date);
      
      // Convert user's timezone input to UTC for backend storage
      const startTime = datetimeLocalToUTC(formData.start_date, adminTimezone);
      const endTime = datetimeLocalToUTC(formData.end_date, adminTimezone);
      
      console.log('Converted start_time (UTC):', startTime);
      console.log('Converted end_time (UTC):', endTime);
      console.log('=== END DEBUG ===');
      
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        start_time: startTime,
        end_time: endTime,
        prize_description: formData.prize_description.trim(),
        active: formData.active,
        official_rules: {
          eligibility_text: formData.eligibility_text.trim(),
          sponsor_name: "Contest Organizer",
          start_date: startTime,
          end_date: endTime,
          prize_value_usd: parseFloat(formData.prize_value),
          terms_url: "https://example.com/terms"
        }
      };

      console.log('Updating contest with payload:', payload);
      console.log('Using admin token:', adminToken.substring(0, 20) + '...');

      const response = await fetch(`${apiBaseUrl}/admin/contests/${contest_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('Update response:', { status: response.status, result });
      
      if (result && result.start_time && result.end_time) {
        console.log('Backend returned start_time:', result.start_time);
        console.log('Backend returned end_time:', result.end_time);
      }

      if (response.ok) {
        setToast({
          type: 'success',
          message: 'Contest updated successfully! The times shown reflect your saved changes.',
          isVisible: true,
        });

        // Refresh the contest data to show the updated values
        if (result && contest_id) {
          console.log('🔍 Full backend response:', result);
          
          // Update the form with the returned data to confirm the save worked
          const updatedContest = result;
          if (updatedContest.start_time && updatedContest.end_time) {
            // Backend sends UTC times - convert back to admin's timezone for display
            const adminTimezone = getAdminTimezone();
            
            console.log('🔄 Converting backend response back to form:');
            console.log('  Backend start_time (UTC):', updatedContest.start_time);
            console.log('  Backend end_time (UTC):', updatedContest.end_time);
            console.log('  Admin timezone:', adminTimezone);
            console.log('  Current form start_date before update:', formData.start_date);
            console.log('  Current form end_date before update:', formData.end_date);
            
            const convertedStartDate = utcToDatetimeLocal(updatedContest.start_time, adminTimezone);
            const convertedEndDate = utcToDatetimeLocal(updatedContest.end_time, adminTimezone);
            
            console.log('  Converted start_date:', convertedStartDate);
            console.log('  Converted end_date:', convertedEndDate);
            
            setFormData(prev => {
              console.log('  Previous form data:', prev);
              const newData = {
                ...prev,
                start_date: convertedStartDate,
                end_date: convertedEndDate,
              };
              console.log('  New form data:', newData);
              return newData;
            });
            
            console.log('✅ Form updated with converted times');
          } else {
            console.log('❌ Missing start_time or end_time in backend response');
          }
        } else {
          console.log('❌ No result or contest_id for form update');
        }
      } else {
        let errorMessage = 'Failed to update contest';
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Admin privileges required.';
        } else if (response.status === 404) {
          errorMessage = 'Contest not found.';
        } else if (response.status === 422) {
          errorMessage = result.detail || 'Invalid contest data provided.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please try again later.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (result.message || result.detail) {
          errorMessage = result.message || result.detail;
        }
        
        setError(errorMessage);
        setToast({
          type: 'error',
          message: errorMessage,
          isVisible: true,
        });
      }
    } catch (err) {
      console.error('Error updating contest:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      setError(errorMessage);
      setToast({
        type: 'error',
        message: errorMessage,
        isVisible: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete contest handlers
  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contest || !contest_id) return;

    setDeleteLoading(true);
    try {
      const result = await deleteContest(contest.id);
      
      if (result.success) {
        setDeleteModalOpen(false);
        
        setToast({
          type: 'success',
          message: 'Contest deleted successfully. Redirecting...',
          isVisible: true,
        });
        
        // Redirect to contests list after successful deletion
        setTimeout(() => {
          navigate('/admin/contests');
        }, 2000);
      } else {
        setToast({
          type: 'error',
          message: `Failed to delete contest: ${result.message}`,
          isVisible: true,
        });
      }
    } catch (error) {
      console.error('Error during delete:', error);
      setToast({
        type: 'error',
        message: 'An unexpected error occurred while deleting the contest.',
        isVisible: true,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contest Not Found</h2>
          <p className="text-gray-600 mb-6">The contest you're trying to edit could not be found.</p>
          <Link
            to="/admin/contests"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Contest</h1>
            <p className="text-gray-600 mt-1">Update contest details and settings</p>
            <p className="text-sm text-blue-600 mt-1">
              🕐 All times in <strong>{getTimezoneDisplayName(getAdminTimezone())}</strong> - displayed in your preferred timezone, stored as UTC
              <Link to="/admin/profile" className="ml-2 underline hover:text-blue-800">
                Change timezone
              </Link>
            </p>
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

      {/* Contest Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-800 font-medium">Editing Contest ID: {contest.id}</p>
            <p className="text-blue-700 text-sm">Created: {new Date(contest.created_at).toLocaleDateString()}</p>
            <p className="text-blue-700 text-sm">Current Entries: {contest.entry_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Contest Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter contest name"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the contest"
              />
            </div>

            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time ({getTimezoneAbbreviation(getAdminTimezone())}) *
              </label>
              <input
                type="datetime-local"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time ({getTimezoneAbbreviation(getAdminTimezone())}) *
              </label>
              <input
                type="datetime-local"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contest location"
              />
            </div>

            <div>
              <label htmlFor="prize_value" className="block text-sm font-medium text-gray-700 mb-2">
                Prize Value (USD) *
              </label>
              <input
                type="number"
                id="prize_value"
                name="prize_value"
                value={formData.prize_value}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="100.00"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="prize_description" className="block text-sm font-medium text-gray-700 mb-2">
                Prize Description *
              </label>
              <textarea
                id="prize_description"
                name="prize_description"
                value={formData.prize_description}
                onChange={handleInputChange}
                required
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the prize"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="eligibility_text" className="block text-sm font-medium text-gray-700 mb-2">
                Eligibility Requirements
              </label>
              <textarea
                id="eligibility_text"
                name="eligibility_text"
                value={formData.eligibility_text}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contest eligibility requirements"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Contest is active (can accept entries)
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/admin/contests"
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Contest'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <div className="border-l-4 border-red-400 bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Danger Zone
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Deleting this contest is a permanent action that cannot be undone. 
                  All contest data, entries, and associated records will be permanently removed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Delete Contest</h3>
            <p className="text-sm text-gray-500 mt-1">
              Permanently delete "{contest?.name}" and all associated data.
            </p>
          </div>
          <button
            onClick={handleDeleteClick}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Contest
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Backend API support pending - see BACKEND_DELETE_CONTEST_REQUIREMENTS.md
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Contest"
        message={`Are you sure you want to delete "${contest?.name}"? This action cannot be undone and will permanently remove the contest and all associated entries.`}
        confirmText="Delete Contest"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default EditContest;
