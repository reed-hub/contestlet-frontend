import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSponsor } from '../utils/auth';
import Toast from '../components/Toast';

interface ContestFormData {
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  prize_description: string;
  image_url: string;
  sponsor_url: string;
  terms_and_conditions: string;
}

const SponsorCreateContest: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });

  const [formData, setFormData] = useState<ContestFormData>({
    name: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    prize_description: '',
    image_url: '',
    sponsor_url: '',
    terms_and_conditions: ''
  });

  // Check authentication on mount
  React.useEffect(() => {
    if (!isSponsor()) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      setToast({
        type: 'error',
        message: 'Please fill in all required fields',
        isVisible: true
      });
      return;
    }

    setLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiBaseUrl}/sponsor/contests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setToast({
          type: 'success',
          message: 'Contest created successfully! Redirecting to contests...',
          isVisible: true
        });
        
        // Redirect to contests list after a short delay
        setTimeout(() => {
          navigate('/sponsor/contests');
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create contest: ${response.status}`);
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create contest',
        isVisible: true
      });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setToast({ type, message, isVisible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  if (!isSponsor()) {
    return <div>Access denied. Sponsor role required.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Contest</h1>
              <p className="mt-2 text-gray-600">Set up a new contest for your audience</p>
            </div>
            <button
              onClick={() => navigate('/sponsor/contests')}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Contests
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contest name"
                  />
                </div>
                
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., United States, California, or specific address"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Contest Description *
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your contest, rules, and what participants need to do"
              />
            </div>

            {/* Timing */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contest Timing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="start_time"
                    name="start_time"
                    required
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="end_time"
                    name="end_time"
                    required
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Prize */}
            <div>
              <label htmlFor="prize_description" className="block text-sm font-medium text-gray-700 mb-2">
                Prize Description *
              </label>
              <textarea
                id="prize_description"
                name="prize_description"
                required
                rows={3}
                value={formData.prize_description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what the winner will receive"
              />
            </div>

            {/* Media & Links */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Media & Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Hero Image/Video URL
                  </label>
                  <input
                    type="url"
                    id="image_url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg or .mp4"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supports .jpg, .png, .gif, .mp4 formats
                  </p>
                </div>
                
                <div>
                  <label htmlFor="sponsor_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Website URL
                  </label>
                  <input
                    type="url"
                    id="sponsor_url"
                    name="sponsor_url"
                    value={formData.sponsor_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div>
              <label htmlFor="terms_and_conditions" className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                id="terms_and_conditions"
                name="terms_and_conditions"
                rows={6}
                value={formData.terms_and_conditions}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter contest terms, eligibility requirements, and any legal disclaimers"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/sponsor/contests')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Contest...' : 'Create Contest'}
              </button>
            </div>
          </form>
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
              <h3 className="text-sm font-medium text-blue-800">Tips for Creating Contests</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Make your contest description clear and engaging</li>
                  <li>Set realistic start and end times</li>
                  <li>Include clear terms and conditions</li>
                  <li>Use high-quality images or videos to attract participants</li>
                  <li>Ensure your prize description is compelling</li>
                </ul>
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
        onClose={hideToast}
      />
    </div>
  );
};

export default SponsorCreateContest;
