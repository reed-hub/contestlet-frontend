import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateUSPhoneNumber, formatPhoneNumber, getCleanPhoneNumber } from '../utils/phoneValidation';

const UniversalLogin: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handlePhoneChange = (value: string) => {
    // Format the phone number as user types
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
    
    // Clear previous error
    setPhoneError(null);
    
    // Validate in real-time (but only if user has typed something)
    if (formatted && formatted.length > 0) {
      const validation = validateUSPhoneNumber(formatted);
      if (!validation.isValid) {
        setPhoneError(validation.error || 'Invalid phone number');
      }
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, and navigation keys
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].includes(e.keyCode)) {
      return;
    }
    
    // Allow only numbers and some formatting characters
    if (!/[\d\s\(\)\-]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submission
    const validation = validateUSPhoneNumber(phone);
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }
    
    setLoading(true);
    setMessage(null);
    setPhoneError(null);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
      const cleanPhone = getCleanPhoneNumber(phone);
      
      // Debug logging
      console.log('📱 Phone number debug:', {
        original: phone,
        cleaned: cleanPhone,
        length: cleanPhone.length
      });
      
      const response = await fetch(`${apiBaseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      if (response.ok) {
        setShowOtpInput(true);
        setMessage({
          type: 'success',
          text: `Verification code sent to ${phone}`
        });
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.detail || 'Failed to send verification code'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error. Please check your connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
      const cleanPhone = getCleanPhoneNumber(phone);
      
      const response = await fetch(`${apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone, code: otp }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Debug logging for OTP verification response
        console.log('🔐 OTP Verification Response:', {
          success: true,
          data,
          role: data.role,
          hasAccessToken: !!data.access_token,
          tokenLength: data.access_token?.length || 0
        });
        
        // Store the JWT token
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_phone', phone);
        
        // Force immediate state update by dispatching storage event
        window.dispatchEvent(new Event('storage'));
        
        setMessage({
          type: 'success',
          text: `Welcome! Redirecting to your dashboard...`
        });

        // Redirect based on user role
        setTimeout(() => {
          switch (data.role) {
            case 'admin':
              navigate('/admin/contests');
              break;
            case 'sponsor':
              navigate('/sponsor/dashboard');
              break;
            case 'user':
              navigate('/user/dashboard');
              break;
            default:
              navigate('/user/dashboard');
          }
        }, 1500);

      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.detail || 'Invalid verification code'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setShowOtpInput(false);
    setOtp('');
    setMessage(null);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-md w-full space-y-6 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Contestlet
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {showOtpInput 
              ? 'Enter your verification code to continue'
              : 'Sign in to access your personalized dashboard'
            }
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Phone Number Form */}
        {!showOtpInput && (
          <form className="mt-6 space-y-4" onSubmit={handlePhoneSubmit}>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onKeyDown={handlePhoneKeyDown}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="+1 (555) 123-4567"
              />
              {phoneError && (
                <p className="mt-2 text-xs text-red-500">{phoneError}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                We'll send a verification code to this number
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Examples: +1 (555) 123-4567 or +1 555-123-4567
              </p>
              
              {/* Quick Test Numbers (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Quick Test Numbers:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePhoneChange('+18187958204')}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Admin: +1 (818) 795-8204
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePhoneChange('+15551234567')}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      User: +1 (555) 123-4567
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePhoneChange('+15559876543')}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                    >
                      Sponsor: +1 (555) 987-6543
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !phone.trim() || phoneError !== null}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </div>
          </form>
        )}

        {/* OTP Verification Form */}
        {showOtpInput && (
          <form className="mt-6 space-y-4" onSubmit={handleOtpSubmit}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="123456"
                maxLength={6}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to {phone}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer Information */}
        <div className="text-center">
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">What happens after login?</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• <strong>Users:</strong> Browse and enter contests</p>
              <p>• <strong>Sponsors:</strong> Create and manage contests</p>
              <p>• <strong>Admins:</strong> Oversee platform operations</p>
            </div>
          </div>
          
          <p className="mt-3 text-xs text-gray-500">
            Don't have an account? Your role will be automatically assigned based on your first login.
          </p>
        </div>

        {/* Development Debug Info */}
        {process.env.REACT_APP_ENVIRONMENT === 'staging' && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-800">
              🔍 STAGING DEBUG: API Base URL = {process.env.REACT_APP_API_BASE_URL || 'NOT SET'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalLogin;