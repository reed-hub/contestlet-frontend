import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatPhoneNumber, validateUSPhoneNumber, getCleanPhoneNumber } from '../utils/phoneValidation';
import Toast from '../components/Toast';

interface Contest {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  prize_description: string;
  image_url?: string; // New field for 1:1 contest image
  sponsor_url?: string; // Sponsor website URL
  sponsor_name?: string; // Direct sponsor name field
  official_rules?: {
    eligibility_text: string;
    sponsor_name: string;
    start_date: string;
    end_date: string;
    prize_value_usd: number;
    terms_url: string;
  };
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';

  // Sample contest data for demonstration
  const sampleContest: Contest = {
    id: contest_id || 'sample-1',
    name: 'Sample Contest',
    description: 'This is a sample contest for demonstration purposes. The actual contest data should be loaded from the database.',
    location: 'Online',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    prize_description: 'Sample prize description with multiple components:\n• First prize component\n• Second prize component\n• Third prize component\n\nPlease check the database for actual contest details.',
    image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=800&fit=crop&crop=center', // Generic contest image
    sponsor_name: 'Sample Sponsor',
    sponsor_url: 'https://example.com', // Added sponsor_url
    official_rules: {
      eligibility_text: 'Open to all participants. Must be 18 years or older.',
      sponsor_name: 'Sample Sponsor',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      prize_value_usd: 100,
      terms_url: 'https://example.com/terms'
    }
  };

  // Fetch contest data on component mount
  useEffect(() => {
    const fetchContest = async () => {
      if (!contest_id) {
        // Use sample data for demonstration
        setContest(sampleContest);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${apiBaseUrl}/contest/${contest_id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Fall back to sample data if contest not found
            setContest(sampleContest);
            setLoading(false);
            return;
          }
          throw new Error(`Failed to load contest: ${response.status}`);
        }
        
        const contestData: Contest = await response.json();
        setContest(contestData);
      } catch (err) {
        // Fall back to sample data on error
        console.log('Using sample contest data due to:', err);
        setContest(sampleContest);
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

    // Validate terms agreement
    if (!agreedToTerms) {
      setToast({
        type: 'error',
        message: 'You must agree to the terms and conditions to enter',
        isVisible: true,
      });
      return;
    }
    
    setPhoneError(null);
    setIsSubmitting(true);

    try {
      // For demo purposes, simulate API call
      if (contest_id && contest_id !== 'sample-1') {
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
          setAgreedToTerms(false);
        } else {
          setToast({
            type: 'error',
            message: data.message || 'Failed to submit entry',
            isVisible: true,
          });
        }
      } else {
        // Demo submission for sample contest
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        setIsSubmitted(true);
        setToast({
          type: 'success',
          message: 'Demo entry submitted successfully! This is a sample contest.',
          isVisible: true,
        });
        setPhoneNumber('');
        setAgreedToTerms(false);
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

  const getTimeRemaining = () => {
    if (!contest?.end_time) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const now = new Date().getTime();
    const endTime = new Date(contest.end_time).getTime();
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  };

  // Countdown timer effect
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [contest?.end_time]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow rounded-lg">
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded-t-lg"></div>
              <div className="p-6 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
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
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">Contest not found</p>
          </div>
        </div>
      </div>
    );
  }

  // Show success confirmation screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
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
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">{contest.name}</h3>
              <p className="text-blue-700 text-sm">Contest ID: {contest.id}</p>
            </div>
            
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
                    setAgreedToTerms(false);
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
      
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Hero Image Section - 1:1 Format */}
          {contest.image_url && (
            <div className="relative w-full aspect-square">
              <img 
                src={contest.image_url} 
                alt={contest.name}
                className="w-full h-full object-cover"
              />
              {/* Optional overlay for text readability */}
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            </div>
          )}
          
          {/* Contest Information Section */}
          <div className="p-6 space-y-6">
            {/* Contest Title */}
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {contest.name}
            </h1>
            
            {/* Sponsor Name - Important Basic Information */}
            <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block w-fit">
              {contest?.official_rules?.sponsor_name || contest?.sponsor_name || 'Contest Sponsor'}
            </div>
            
            {/* Location and End Time */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{contest.location || 'United States'}</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ends {timeRemaining.days}:{timeRemaining.hours.toString().padStart(2, '0')}:{timeRemaining.minutes.toString().padStart(2, '0')}:{timeRemaining.seconds.toString().padStart(2, '0')}</span>
              </div>
            </div>
            
            {/* Contest Description */}
            <p className="text-gray-700 text-lg leading-relaxed">
              {contest.description}
            </p>
            
            {/* What You Can Win Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">What you can win</h2>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">👑</div>
                  <div className="text-sm text-gray-600 font-medium">1 WINNER</div>
                </div>
                <div className="space-y-3">
                  {contest.prize_description.split('\n').map((prize, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-gray-900 mr-3">•</span>
                      <span className="text-gray-900 text-sm">{prize.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Official Rules Section */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Official Rules & Regulations</h3>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            {/* Enter Now Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Enter Now</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phone Number Input */}
                <div>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="(555) 555-1234"
                    maxLength={14}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg ${
                      phoneError ? 'border-red-300' : ''
                    }`}
                    disabled={isSubmitting}
                  />
                  {phoneError && (
                    <p className="mt-2 text-sm text-red-600">{phoneError}</p>
                  )}
                </div>
                
                {/* Terms and Conditions Checkbox */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                    I agree to the terms of service and privacy policy to receive text messages. 
                    Message and data rates may apply. Message frequency varies. Reply STOP to cancel and HELP for help.
                  </label>
                </div>
                
                {/* Enter Now Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !phoneNumber.trim() || !agreedToTerms}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : (
                    'Enter Now'
                  )}
                </button>
                
                {/* Verification Message */}
                <p className="text-sm text-gray-600 text-center">
                  We will send you a text message with a verification code to verify your entry. 
                  No purchase necessary. See rules.{' '}
                  <button 
                    type="button"
                    className="text-blue-600 hover:text-blue-800 underline"
                    onClick={() => alert('Rules would open here in production')}
                  >
                    See rules
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestEntryPage;
