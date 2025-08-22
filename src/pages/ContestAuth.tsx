import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatPhoneNumber, validateUSPhoneNumber, getCleanPhoneNumber } from '../utils/phoneValidation';
import { setUserToken, setUserPhone } from '../utils/auth';
import Toast from '../components/Toast';

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
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';

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
          code: otpCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the user token and phone number
        setUserToken(data.access_token);
        setUserPhone(phoneNumber);
        
        setToast({
          type: 'success',
          message: 'Phone verified via Twilio! Entering contest...',
          isVisible: true,
        });

        // Proceed to enter the contest automatically
        setTimeout(() => {
          enterContest(data.access_token);
        }, 1000);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
      
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 'phone' ? 'Enter Contest' : 'Verify Your Phone'}
            </h1>
            <p className="text-gray-600">
              {step === 'phone' 
                ? 'Enter your phone number to participate in the contest'
                : `We sent a 6-digit code to ${phoneNumber}`
              }
            </p>
            {contest_id && (
              <div className="mt-4 px-4 py-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">Contest ID: {contest_id}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'phone' ? (
              <>
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
                    maxLength={14}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      phoneError ? 'border-red-300' : 'border-gray-200'
                    }`}
                    disabled={isLoading}
                  />
                  {phoneError && (
                    <p className="mt-2 text-sm text-red-600">{phoneError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !phoneNumber.trim() || !!retryAfter}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold py-3 px-8 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otpCode}
                    onChange={handleOtpChange}
                    placeholder="123456"
                    maxLength={6}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      otpError ? 'border-red-300' : 'border-gray-200'
                    }`}
                    disabled={isLoading}
                  />
                  {otpError && (
                    <p className="mt-2 text-sm text-red-600">{otpError}</p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={backToPhone}
                    className="flex-1 border-2 border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    disabled={isLoading}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="flex-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              {step === 'phone' 
                ? 'We will send you a text message with a verification code via Twilio Verify'
                : 'Didn\'t receive the code? Wait 60 seconds and go back to try again'
              }
            </p>
            {step === 'otp' && process.env.NODE_ENV === 'development' && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700 text-xs">
                💡 Development mode: Try code <code className="bg-blue-100 px-1 rounded">123456</code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestAuth;
