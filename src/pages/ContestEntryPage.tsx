import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatPhoneNumber, validateUSPhoneNumber, getCleanPhoneNumber } from '../utils/phoneValidation';
import Toast from '../components/Toast';

interface Contest {
  id: string;
  title: string;
  description: string;
  end_date: string;
}

interface SubmissionResponse {
  success: boolean;
  message: string;
  entry_id?: string;
}

const ContestEntryPage: React.FC = () => {
  const { contest_id } = useParams<{ contest_id: string }>();
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';

  // Fetch contest data on component mount
  useEffect(() => {
    const fetchContest = async () => {
      if (!contest_id) {
        setError('Contest ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${apiBaseUrl}/contest/${contest_id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Contest not found');
          }
          throw new Error(`Failed to load contest: ${response.status}`);
        }
        
        const contestData: Contest = await response.json();
        setContest(contestData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contest');
      } finally {
        setLoading(false);
      }
    };

    fetchContest();
  }, [contest_id, apiBaseUrl]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    
    // Clear previous error when user starts typing
    if (phoneError) {
      setPhoneError(null);
    }
    
    // Clear submission status when user modifies form
    if (isSubmitted) {
      setIsSubmitted(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number
    const validation = validateUSPhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }
    
    setPhoneError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contest_id: contest_id,
          phone_number: getCleanPhoneNumber(phoneNumber),
        }),
      });

      const data: SubmissionResponse = await response.json();

      if (response.ok && data.success) {
        setIsSubmitted(true);
        setToast({
          type: 'success',
          message: data.message || 'Entry submitted successfully!',
          isVisible: true,
        });
        // Clear form on success
        setPhoneNumber('');
      } else {
        setToast({
          type: 'error',
          message: data.message || 'Failed to submit entry',
          isVisible: true,
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error occurred',
        isVisible: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Contest</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">Contest not found</p>
        </div>
      </div>
    );
  }

  // Show success confirmation screen
  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Toast
          type={toast.type}
          message={toast.message}
          isVisible={toast.isVisible}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
        
        <div className="bg-white shadow-lg rounded-xl p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🎉 You're In!</h1>
          <p className="text-xl text-gray-600 mb-6">
            Your contest entry has been submitted successfully.
          </p>
          
          {contest && (
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">{contest.title}</h3>
              <p className="text-blue-700 text-sm">Contest ID: {contest.id}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>✨ You'll be notified if you win</p>
              <p>📱 Keep your phone handy for updates</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setPhoneNumber('');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Enter Another Contest
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
      
      <div className="bg-white shadow rounded-lg p-6">
        {/* Contest Information */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{contest.title}</h1>
          <p className="text-gray-700 text-lg mb-4">{contest.description}</p>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Contest ends: {formatDate(contest.end_date)}</span>
          </div>
        </div>

        {/* Entry Form */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Enter Contest</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                maxLength={14} // Formatted phone number length
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  phoneError ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-600">{phoneError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !phoneNumber.trim()}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </div>
              ) : (
                'Submit Entry'
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};

export default ContestEntryPage;
