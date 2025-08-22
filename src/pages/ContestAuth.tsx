import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatPhoneNumber, validateUSPhoneNumber, getCleanPhoneNumber } from '../utils/phoneValidation';
import { setUserToken, setUserPhone } from '../utils/auth';
import Toast from '../components/Toast';

interface Contest {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  prize_description: string;
  image_url?: string;
  official_rules?: {
    eligibility_text: string;
    sponsor_name: string;
    start_date: string;
    end_date: string;
    prize_value_usd: number;
    terms_url: string;
  };
}

const ContestAuth: React.FC = () => {
  const { contest_id } = useParams<{ contest_id: string }>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Sample contest data for demonstration
  const sampleContest: Contest = {
    id: contest_id || 'sample-1',
    name: 'The Island of Maui Adventure of a Lifetime',
    description: 'Get ready to pack your bags – you could win the trip of a lifetime to Hawai\'i for 2!',
    location: 'United States',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    prize_description: 'Two (2) roundtrip tickets on Southwest Airlines from Dallas to Maui, HI\nA 3-night stay, double occupancy, at the Grand Manila Hotel Hilo on the island of Hawai\'i (subject to availability at the time of booking)\nA 2-night stay, double occupancy, at the Royal Kona Resort on the island of Hawaii (subject to availability at the time of booking)\nA Snorkel Adventure or Evening Manta Swim for two (2) guests with Fair Wind Cruises on the beautiful Kona Coast\nKilauea Volcano and Dinner Tour for two (2) guests with Kailani Tours\nUmauma Experience Zipline Adventure for two (2) guests',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop&crop=center', // Sample Maui resort image
    official_rules: {
      eligibility_text: 'Open to all participants. Must be 18 years or older.',
      sponsor_name: 'Travel Adventure Show',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      prize_value_usd: 5000,
      terms_url: 'https://example.com/terms'
    }
  };

  // Fetch contest data on component mount
  useEffect(() => {
    const fetchContest = async () => {
      if (!contest_id) {
        setContest(sampleContest);
        return;
      }

      try {
        // Try to fetch from the actual API endpoint first
        const response = await fetch(`${apiBaseUrl}/contest/${contest_id}`);
        
        if (response.ok) {
          const contestData: Contest = await response.json();
          console.log('Fetched contest from API:', contestData);
          setContest(contestData);
        } else if (response.status === 404) {
          // Contest not found - use sample data for demo
          console.log('Contest not found in API, using sample data');
          setContest(sampleContest);
        } else {
          // API error - fall back to sample data
          console.log('API error, using sample data:', response.status);
          setContest(sampleContest);
        }
      } catch (err) {
        // Network error or API not available - use sample data
        console.log('Network error or API not available, using sample data:', err);
        setContest(sampleContest);
      }
    };

    fetchContest();
  }, [contest_id, apiBaseUrl]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(value);
    
    if (otpError) {
      setOtpError(null);
    }
  };

  const requestOTP = async () => {
    // Validate phone number
    const validation = validateUSPhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }

    setPhoneError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: getCleanPhoneNumber(phoneNumber),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('otp');
        setRetryAfter(data.retry_after || 60);
        setToast({
          type: 'success',
          message: process.env.NODE_ENV === 'development' 
            ? 'SMS sent via Twilio! (Development: use 123456)'
            : 'SMS sent via Twilio Verify to your phone!',
          isVisible: true,
        });
      } else {
        if (response.status === 429) {
          setRetryAfter(data.retry_after || 60);
          setPhoneError(`Twilio rate limit exceeded. Try again in ${data.retry_after || 60} seconds.`);
        } else {
          setPhoneError(data.message || 'Failed to send SMS via Twilio Verify');
        }
      }
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter a 6-digit code');
      return;
    }

    setOtpError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: getCleanPhoneNumber(phoneNumber),
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setUserToken(data.token);
        setUserPhone(phoneNumber);
        
        setToast({
          type: 'success',
          message: 'Phone verified successfully!',
          isVisible: true,
        });

        // Enter the contest
        await enterContest(data.token);
      } else {
        setOtpError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const enterContest = async (token: string) => {
    try {
      console.log('Entering contest:', contest_id);
      console.log('API URL:', `${apiBaseUrl}/contests/${contest_id}/enter`);
      console.log('Using token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${apiBaseUrl}/contests/${contest_id}/enter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Contest entry response:', { status: response.status, data });

      if (response.ok) {
        setToast({
          type: 'success',
          message: 'Successfully entered contest!',
          isVisible: true,
        });
        
        // Navigate to success page after delay
        setTimeout(() => {
          navigate(`/contest/${contest_id}/success`);
        }, 2000);
      } else {
        if (response.status === 409) {
          setToast({
            type: 'warning',
            message: 'You have already entered this contest!',
            isVisible: true,
          });
        } else if (response.status === 400) {
          setToast({
            type: 'error',
            message: data.message || data.detail || 'This contest has expired or is not available.',
            isVisible: true,
          });
        } else {
          setToast({
            type: 'error',
            message: data.message || data.detail || 'Failed to enter contest',
            isVisible: true,
          });
        }
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error occurred',
        isVisible: true,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 'phone') {
      requestOTP();
    } else {
      verifyOTP();
    }
  };

  const backToPhone = () => {
    setStep('phone');
    setOtpCode('');
    setOtpError(null);
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

  if (!contest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
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
            {/* Travel Adventure Show Label */}
            <div className="text-blue-600 text-sm font-medium">
              Travel Adventure Show
            </div>
            
            {/* Contest Title */}
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {contest.name}
            </h1>
            
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
                {step === 'phone' ? (
                  <>
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
                        disabled={isLoading}
                      />
                      {phoneError && (
                        <p className="mt-2 text-sm text-red-600">{phoneError}</p>
                      )}
                    </div>
                    
                    {/* Send Code Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !phoneNumber.trim() || !!retryAfter}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending Code...
                        </div>
                      ) : retryAfter ? (
                        `Wait ${retryAfter}s`
                      ) : (
                        '📱 Send Verification Code'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* OTP Input */}
                    <div>
                      <input
                        type="text"
                        id="otp"
                        value={otpCode}
                        onChange={handleOtpChange}
                        placeholder="123456"
                        maxLength={6}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                          otpError ? 'border-red-300' : ''
                        }`}
                        disabled={isLoading}
                      />
                      {otpError && (
                        <p className="mt-2 text-sm text-red-600">{otpError}</p>
                      )}
                    </div>
                    
                    {/* OTP Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={backToPhone}
                        className="flex-1 border-2 border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                        disabled={isLoading}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || otpCode.length !== 6}
                        className="flex-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Verifying...
                          </div>
                        ) : (
                          '🎯 Enter Contest'
                        )}
                      </button>
                    </div>
                  </>
                )}
                
                {/* Verification Message */}
                <p className="text-sm text-gray-600 text-center">
                  {step === 'phone' 
                    ? 'We will send you a text message with a verification code to verify your entry. No purchase necessary. See rules.'
                    : `We sent a 6-digit code to ${phoneNumber}. Didn't receive it? Wait 60 seconds and go back to try again.`
                  }
                  {step === 'phone' && (
                    <button 
                      type="button"
                      className="text-blue-600 hover:text-blue-800 underline ml-1"
                      onClick={() => alert('Rules would open here in production')}
                    >
                      See rules
                    </button>
                  )}
                </p>
                
                {/* Development Mode Info */}
                {step === 'otp' && process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700 text-xs text-center">
                    💡 Development mode: Try code <code className="bg-blue-100 px-1 rounded">123456</code>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestAuth;
