import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken, clearAllTokens } from '../utils/auth';
import { datetimeLocalToUTC, createDefaultContestDates, getAdminTimezone, getTimezoneDisplayName, getTimezoneAbbreviation } from '../utils/timezone';
import Toast from '../components/Toast';

interface ContestFormData {
  // Basic Information (8 fields)
  name: string;
  description: string;
  location: string;
  prize_description: string;
  start_date: string;
  end_date: string;
  prize_value: string; // Will map to official_rules.prize_value_usd
  eligibility_text: string; // Will map to official_rules.eligibility_text
  
  // Advanced Options (10 fields)
  contest_type: string; // 'general', 'sweepstakes', 'instant_win'
  entry_method: string; // 'sms', 'email', 'web_form' (renamed from entry_type)
  winner_selection_method: string; // 'random', 'scheduled', 'instant'
  minimum_age: string; // 13-100, default 18
  max_entries_per_person: string; // null = unlimited
  total_entry_limit: string; // null = unlimited
  consolation_offer: string; // renamed from consolation_prize
  geographic_restrictions: string; // renamed from geographic_restriction
  contest_tags: string; // comma-separated, will convert to array
  promotion_channels: string[]; // array of strings
  
  // SMS Templates (3 fields)
  entry_confirmation_sms: string; // renamed from initial_sms_template
  winner_notification_sms: string; // renamed from winner_sms_template
  non_winner_sms: string; // renamed from non_winner_sms_template
  
  // Legal Compliance (4 fields)
  sponsor_name: string; // Will map to official_rules.sponsor_name
  terms_url: string; // Will map to official_rules.terms_url
  official_start_date: string; // Will map to official_rules.start_date
  official_end_date: string; // Will map to official_rules.end_date
}

const NewContest: React.FC = () => {
  const location = useLocation();
  const [isImportMode, setIsImportMode] = useState(false);
  const [formData, setFormData] = useState<ContestFormData>({
    // Basic Information
    name: '',
    description: '',
    location: 'Online',
    prize_description: '',
    start_date: '',
    end_date: '',
    prize_value: '100',
    eligibility_text: 'Open to all participants. Must be 18 years or older.',
    
    // Advanced Options - Default Values
    contest_type: 'general',
    entry_method: 'sms', // renamed from entry_type
    winner_selection_method: 'random',
    minimum_age: '18', // renamed from age_restriction
    max_entries_per_person: '', // renamed from entry_limit_per_person
    total_entry_limit: '',
    consolation_offer: '', // renamed from consolation_prize
    geographic_restrictions: '', // renamed from geographic_restriction
    contest_tags: '',
    promotion_channels: [],
    
    // SMS Templates
    entry_confirmation_sms: '🎉 You\'re entered! Contest details: {contest_name}. Good luck!', // renamed from initial_sms_template
    winner_notification_sms: '🏆 Congratulations! You won: {prize_description}. Instructions: {claim_instructions}', // renamed from winner_sms_template
    non_winner_sms: 'Thanks for participating in {contest_name}! {consolation_offer}', // renamed from non_winner_sms_template
    
    // Legal Compliance
    sponsor_name: 'Contestlet',
    terms_url: 'https://contestlet.com/terms',
    official_start_date: '', // new field
    official_end_date: '' // new field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });
  const navigate = useNavigate();

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';

  // Helper function to map campaign data to form data
  const mapCampaignToFormData = (campaignData: any): ContestFormData => {
    // Calculate dates based on duration or use overrides
    let startDate = '';
    let endDate = '';
    
    if (campaignData.start_time) {
      // Handle various date formats from campaign data
      const startTime = new Date(campaignData.start_time);
      startDate = startTime.toISOString().slice(0, 16); // Format for datetime-local
    } else if (campaignData.duration_days) {
      const now = new Date();
      const start = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Start tomorrow
      const end = new Date(start.getTime() + (campaignData.duration_days * 24 * 60 * 60 * 1000));
      
      startDate = start.toISOString().slice(0, 16);
      endDate = end.toISOString().slice(0, 16);
    }
    
    if (campaignData.end_time && !endDate) {
      const endTime = new Date(campaignData.end_time);
      endDate = endTime.toISOString().slice(0, 16);
    }
    
    // Extract promotion channels from various formats
    let promotionChannels: string[] = [];
    if (Array.isArray(campaignData.promotion_channels)) {
      promotionChannels = campaignData.promotion_channels;
    } else if (typeof campaignData.promotion_channels === 'string') {
      promotionChannels = campaignData.promotion_channels.split(',').map((c: string) => c.trim());
    }
    
    // Extract messaging templates with comprehensive fallbacks
    const messaging = campaignData.messaging || {};
    
    // Handle prize value extraction from various sources
    let prizeValue = '100'; // Default
    if (campaignData.prize_value) {
      prizeValue = campaignData.prize_value.toString();
    } else if (campaignData.official_rules?.prize_value_usd) {
      prizeValue = campaignData.official_rules.prize_value_usd.toString();
    } else if (campaignData.reward_logic?.prize_value) {
      prizeValue = campaignData.reward_logic.prize_value.toString();
    }
    
    // Handle eligibility text from multiple sources
    let eligibilityText = 'Open to all participants. Must be 18 years or older.';
    if (campaignData.eligibility_text) {
      eligibilityText = campaignData.eligibility_text;
    } else if (campaignData.official_rules?.eligibility_text) {
      eligibilityText = campaignData.official_rules.eligibility_text;
    } else if (Array.isArray(campaignData.requirements)) {
      eligibilityText = campaignData.requirements.join('. ');
    } else if (Array.isArray(campaignData.rules)) {
      eligibilityText = campaignData.rules.join('. ');
    }
    
    // Handle winner selection method mapping
    let winnerSelectionMethod = 'random';
    if (campaignData.winner_selection_method) {
      winnerSelectionMethod = campaignData.winner_selection_method;
    } else if (campaignData.reward_logic?.type) {
      const type = campaignData.reward_logic.type;
      if (type === 'first_come_first_serve' || type === 'fcfs') {
        winnerSelectionMethod = 'first_come_first_serve';
      } else if (type === 'judged' || type === 'manual') {
        winnerSelectionMethod = 'judged';
      } else if (type === 'most_entries') {
        winnerSelectionMethod = 'most_entries';
      }
    }
    
    // Handle contest tags from various formats
    let contestTags = '';
    if (Array.isArray(campaignData.tags)) {
      contestTags = campaignData.tags.join(', ');
    } else if (Array.isArray(campaignData.categories)) {
      contestTags = campaignData.categories.join(', ');
    } else if (typeof campaignData.tags === 'string') {
      contestTags = campaignData.tags;
    } else if (typeof campaignData.contest_tags === 'string') {
      contestTags = campaignData.contest_tags;
    }
    
    return {
      // Basic Contest Information
      name: campaignData.name || '',
      description: campaignData.description || '',
      start_date: startDate,
      end_date: endDate,
      location: campaignData.location || 'Online',
      prize_description: campaignData.reward_logic?.winner_reward || 
                        campaignData.reward_logic?.reward || 
                        campaignData.prize_description || '',
      prize_value: prizeValue,
      eligibility_text: eligibilityText,
      
      // Advanced Contest Configuration
      contest_type: campaignData.contest_type || 
                   campaignData.type || 
                   'general', // Always default to 'general' (valid enum)
      entry_method: campaignData.entry_method || 
                   (campaignData.entry_type === 'SMS opt-in' ? 'sms' : 
                    campaignData.entry_type === 'email' ? 'email' : 
                    campaignData.entry_type === 'web form' ? 'web_form' : 'sms'),
      winner_selection_method: winnerSelectionMethod,
      consolation_offer: campaignData.reward_logic?.consolation_offer || 
                        campaignData.consolation_prize || '',
      max_entries_per_person: (campaignData.entry_limit_per_person || 
                              campaignData.max_entries_per_person || '')?.toString() || '',
      total_entry_limit: (campaignData.total_entry_limit || 
                         campaignData.max_total_entries || 
                         campaignData.reward_logic?.limit || '')?.toString() || '',
      minimum_age: (campaignData.age_restriction || 
                       campaignData.min_age || 
                       campaignData.official_rules?.min_age || '18').toString(),
      geographic_restrictions: campaignData.geographic_restriction || 
                             campaignData.location_restriction || '',
      
      // SMS Messaging Templates
      entry_confirmation_sms: messaging.initial_sms || 
                           messaging.entry_sms || 
                           messaging.welcome_sms || 
                           '🎉 You\'re entered! Contest details: {contest_name}. Good luck!',
      winner_notification_sms: messaging.winner_sms || 
                          messaging.win_sms || 
                          '🏆 Congratulations! You won: {prize_description}. Instructions: {claim_instructions}',
      non_winner_sms: messaging.non_winner_sms || 
                              messaging.lose_sms || 
                              messaging.consolation_sms || 
                              'Thanks for participating in {contest_name}! {consolation_offer}',
      
      // Marketing and Promotion
      promotion_channels: promotionChannels,
      sponsor_name: campaignData.sponsor_name || 
                   campaignData.official_rules?.sponsor_name || 
                   'Contestlet',
      terms_url: campaignData.terms_url || 
                campaignData.official_rules?.terms_url || 
                'https://contestlet.com/terms',
      contest_tags: contestTags,
      
      // Official Rules Dates (use contest dates if not specified)
      official_start_date: campaignData.official_rules?.start_date || 
                          campaignData.start_date || '',
      official_end_date: campaignData.official_rules?.end_date || 
                        campaignData.end_date || ''
    };
  };

  // Check authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Parse imported campaign data from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const importData = urlParams.get('import');
    
    if (importData) {
      try {
        const campaignData = JSON.parse(decodeURIComponent(importData));
        setIsImportMode(true);
        setShowAdvancedOptions(true); // Show advanced options for imported campaigns
        
        // Map campaign data to form fields
        const mappedData = mapCampaignToFormData(campaignData);
        setFormData(mappedData);
        
        // Show success message about import
        setToast({
          type: 'info',
          message: `Campaign "${campaignData.name}" imported! Review and modify as needed before creating.`,
          isVisible: true,
        });
      } catch (error) {
        console.error('Failed to parse imported campaign:', error);
        setError('Failed to load imported campaign data. Please try again.');
      }
    }
  }, [location.search]);

  // Set default dates on component mount using admin's timezone
  useEffect(() => {
    if (!formData.start_date || !formData.end_date) {
      const defaultDates = createDefaultContestDates();
      setFormData(prev => ({
        ...prev,
        start_date: prev.start_date || defaultDates.start_date,
        end_date: prev.end_date || defaultDates.end_date
      }));
    }
  }, [formData.start_date, formData.end_date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handlePromotionChannelChange = (channel: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      promotion_channels: checked 
        ? [...prev.promotion_channels, channel]
        : prev.promotion_channels.filter(c => c !== channel)
    }));
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
      
      // Transform data to match API format with timezone conversion
      // Convert times from user's preference timezone to UTC for backend storage
      const adminTimezone = getAdminTimezone();
      const startTimeUTC = datetimeLocalToUTC(formData.start_date, adminTimezone);
      const endTimeUTC = datetimeLocalToUTC(formData.end_date, adminTimezone);
      
      // Prepare official rules dates (use contest dates if not specified)
      const officialStartDate = formData.official_start_date ? 
        datetimeLocalToUTC(formData.official_start_date, adminTimezone) : startTimeUTC;
      const officialEndDate = formData.official_end_date ? 
        datetimeLocalToUTC(formData.official_end_date, adminTimezone) : endTimeUTC;

      const apiPayload = {
        // Basic Information (8 required fields)
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        prize_description: formData.prize_description.trim() || undefined,
        start_time: startTimeUTC,
        end_time: endTimeUTC,
        
        // Advanced Options (10 fields)
        contest_type: formData.contest_type,
        entry_method: formData.entry_method, // renamed from entry_type
        winner_selection_method: formData.winner_selection_method,
        minimum_age: parseInt(formData.minimum_age) || 18,
        ...(formData.max_entries_per_person && { max_entries_per_person: parseInt(formData.max_entries_per_person) }),
        ...(formData.total_entry_limit && { total_entry_limit: parseInt(formData.total_entry_limit) }),
        ...(formData.consolation_offer.trim() && { consolation_offer: formData.consolation_offer.trim() }),
        ...(formData.geographic_restrictions.trim() && { geographic_restrictions: formData.geographic_restrictions.trim() }),
        ...(formData.contest_tags.trim() && { contest_tags: formData.contest_tags.split(',').map((tag: string) => tag.trim()).filter(tag => tag) }),
        ...(formData.promotion_channels.length > 0 && { promotion_channels: formData.promotion_channels }),
        
        // SMS Templates (3 fields) - new structure
        sms_templates: {
          entry_confirmation: formData.entry_confirmation_sms.trim() || undefined,
          winner_notification: formData.winner_notification_sms.trim() || undefined,
          non_winner: formData.non_winner_sms.trim() || undefined
        },
        
        // Official Rules (4 required fields)
        official_rules: {
          eligibility_text: formData.eligibility_text.trim(),
          sponsor_name: formData.sponsor_name.trim(),
          start_date: officialStartDate,
          end_date: officialEndDate,
          prize_value_usd: parseFloat(formData.prize_value),
          terms_url: formData.terms_url.trim() || undefined
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
        message: isImportMode 
          ? `Contest "${formData.name}" created successfully from imported campaign! Redirecting...`
          : `Contest "${formData.name}" created successfully! Redirecting...`,
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
        eligibility_text: 'Open to all participants. Must be 18 years or older.',
        // Advanced Options - Reset to defaults
        contest_type: 'general',
        entry_method: 'sms',
        winner_selection_method: 'random',
        consolation_offer: '',
        max_entries_per_person: '',
        total_entry_limit: '',
        minimum_age: '18',
        geographic_restrictions: '',
        entry_confirmation_sms: '🎉 You\'re entered! Contest details: {contest_name}. Good luck!',
        winner_notification_sms: '🏆 Congratulations! You won: {prize_description}. Instructions: {claim_instructions}',
        non_winner_sms: 'Thanks for participating in {contest_name}! {consolation_offer}',
        promotion_channels: [],
        sponsor_name: 'Contestlet',
        terms_url: 'https://contestlet.com/terms',
        contest_tags: '',
        official_start_date: '',
        official_end_date: ''
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
      eligibility_text: 'Open to all participants. Must be 18 years or older.',
      // Advanced Options - Reset to defaults
      contest_type: 'general',
      entry_method: 'sms',
      winner_selection_method: 'random',
      consolation_offer: '',
      max_entries_per_person: '',
      total_entry_limit: '',
      minimum_age: '18',
      geographic_restrictions: '',
      entry_confirmation_sms: '🎉 You\'re entered! Contest details: {contest_name}. Good luck!',
      winner_notification_sms: '🏆 Congratulations! You won: {prize_description}. Instructions: {claim_instructions}',
      non_winner_sms: 'Thanks for participating in {contest_name}! {consolation_offer}',
      promotion_channels: [],
      sponsor_name: 'Contestlet',
      terms_url: 'https://contestlet.com/terms',
      contest_tags: '',
      official_start_date: '',
      official_end_date: ''
    });
    setError(null);
    setToast({ type: 'info', message: '', isVisible: false });
    setShowAdvancedOptions(false);
    setIsImportMode(false);
    // Clear URL parameters
    window.history.replaceState({}, '', '/admin/contests/new');
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
            <h1 className="text-2xl font-bold text-gray-900">
              {isImportMode ? (
                <>
                  📥 Review Imported Campaign
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Import Mode
                  </span>
                </>
              ) : (
                'Create New Contest'
              )}
            </h1>
            <p className="text-gray-600 mt-1">
              {isImportMode 
                ? 'Review and modify the imported campaign data below, then create the contest'
                : 'Fill in the details to create a new contest'
              }
            </p>
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
                Start Date ({getTimezoneAbbreviation(getAdminTimezone())}) *
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
                End Date ({getTimezoneAbbreviation(getAdminTimezone())}) *
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

          {/* Advanced Options Toggle */}
          <div className="border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center justify-between w-full p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-gray-900">Advanced Options</span>
                <span className="ml-2 text-sm text-gray-500">(Optional campaign settings)</span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                  showAdvancedOptions ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Advanced Options Content */}
            {showAdvancedOptions && (
              <div className="mt-4 p-6 bg-gray-50 border border-gray-200 rounded-lg space-y-6">
                <div className="text-sm text-gray-600 mb-4">
                  <p className="font-medium mb-2">🚀 Advanced Campaign Configuration</p>
                  <p>Configure additional contest parameters, messaging templates, and marketing settings. These settings are optional and will use smart defaults if left empty.</p>
                </div>

                {/* Contest Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contest_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Contest Type
                    </label>
                    <select
                      id="contest_type"
                      name="contest_type"
                      value={formData.contest_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    >
                      <option value="general">General Contest</option>
                      <option value="weekly">Weekly Contest</option>
                      <option value="flash">Flash Contest</option>
                      <option value="seasonal">Seasonal Contest</option>
                      <option value="promotion">Promotional Contest</option>
                      <option value="loyalty">Loyalty Reward</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="entry_method" className="block text-sm font-medium text-gray-700 mb-2">
                      Entry Method
                    </label>
                    <select
                      id="entry_method"
                      name="entry_method"
                      value={formData.entry_method}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    >
                      <option value="sms">SMS Entry</option>
                      <option value="email">Email Entry</option>
                      <option value="social">Social Media</option>
                      <option value="web">Web Form</option>
                      <option value="qr_code">QR Code Scan</option>
                      <option value="in_store">In-Store Entry</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="winner_selection_method" className="block text-sm font-medium text-gray-700 mb-2">
                      Winner Selection Method
                    </label>
                    <select
                      id="winner_selection_method"
                      name="winner_selection_method"
                      value={formData.winner_selection_method}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    >
                      <option value="random">Random Selection</option>
                      <option value="first_come_first_serve">First Come, First Serve</option>
                      <option value="judged">Judged Competition</option>
                      <option value="most_entries">Most Entries</option>
                      <option value="manual">Manual Selection</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="minimum_age" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Age
                    </label>
                    <input
                      type="number"
                      id="minimum_age"
                      name="minimum_age"
                      min="13"
                      max="100"
                      value={formData.minimum_age}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="18"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Entry Limits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="max_entries_per_person" className="block text-sm font-medium text-gray-700 mb-2">
                      Max Entries Per Person
                    </label>
                    <input
                      type="number"
                      id="max_entries_per_person"
                      name="max_entries_per_person"
                      min="1"
                      value={formData.max_entries_per_person}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Unlimited"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="total_entry_limit" className="block text-sm font-medium text-gray-700 mb-2">
                      Total Entry Limit
                    </label>
                    <input
                      type="number"
                      id="total_entry_limit"
                      name="total_entry_limit"
                      min="1"
                      value={formData.total_entry_limit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Unlimited"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Prizes and Geography */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="consolation_offer" className="block text-sm font-medium text-gray-700 mb-2">
                      Consolation Prize/Offer
                    </label>
                    <input
                      type="text"
                      id="consolation_offer"
                      name="consolation_offer"
                      value={formData.consolation_offer}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 10% discount code"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="geographic_restrictions" className="block text-sm font-medium text-gray-700 mb-2">
                      Geographic Restrictions
                    </label>
                    <input
                      type="text"
                      id="geographic_restrictions"
                      name="geographic_restrictions"
                      value={formData.geographic_restrictions}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., US residents only, California only"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Contest Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="sponsor_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsor Name
                    </label>
                    <input
                      type="text"
                      id="sponsor_name"
                      name="sponsor_name"
                      value={formData.sponsor_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your Company Name"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="terms_url" className="block text-sm font-medium text-gray-700 mb-2">
                      Terms & Conditions URL
                    </label>
                    <input
                      type="url"
                      id="terms_url"
                      name="terms_url"
                      value={formData.terms_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://your-site.com/terms"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Official Rules Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="official_start_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Official Start Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      id="official_start_date"
                      name="official_start_date"
                      value={formData.official_start_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to use contest start date</p>
                  </div>

                  <div>
                    <label htmlFor="official_end_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Official End Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      id="official_end_date"
                      name="official_end_date"
                      value={formData.official_end_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to use contest end date</p>
                  </div>
                </div>

                {/* Contest Tags */}
                <div>
                  <label htmlFor="contest_tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Contest Tags
                  </label>
                  <input
                    type="text"
                    id="contest_tags"
                    name="contest_tags"
                    value={formData.contest_tags}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., holiday, summer, loyalty, flash-sale (comma-separated)"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
                </div>

                {/* Promotion Channels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promotion Channels
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Instagram', 'Facebook', 'Twitter', 'Email Newsletter', 'In-Store Signage', 'Website Banner', 'SMS Blast', 'Radio/TV', 'Print Media'].map((channel) => (
                      <label key={channel} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.promotion_channels.includes(channel)}
                          onChange={(e) => handlePromotionChannelChange(channel, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={isSubmitting}
                        />
                        <span className="ml-2 text-sm text-gray-700">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* SMS Templates */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">📱 SMS Message Templates</h4>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="entry_confirmation_sms" className="block text-sm font-medium text-gray-700 mb-2">
                        Entry Confirmation SMS
                      </label>
                      <textarea
                        id="entry_confirmation_sms"
                        name="entry_confirmation_sms"
                        rows={2}
                        value={formData.entry_confirmation_sms}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Message sent when someone enters the contest"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">Use {'{contest_name}'} to insert contest name</p>
                    </div>

                    <div>
                      <label htmlFor="winner_notification_sms" className="block text-sm font-medium text-gray-700 mb-2">
                        Winner Notification SMS
                      </label>
                      <textarea
                        id="winner_notification_sms"
                        name="winner_notification_sms"
                        rows={2}
                        value={formData.winner_notification_sms}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Message sent to contest winners"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">Use {'{prize_description}'} and {'{claim_instructions}'}</p>
                    </div>

                    <div>
                      <label htmlFor="non_winner_sms" className="block text-sm font-medium text-gray-700 mb-2">
                        Non-Winner SMS (Optional)
                      </label>
                      <textarea
                        id="non_winner_sms"
                        name="non_winner_sms"
                        rows={2}
                        value={formData.non_winner_sms}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Message sent to non-winners (consolation offer)"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">Use {'{consolation_offer}'} to insert consolation prize</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                isImportMode ? '📥 Create Contest from Import' : '🎯 Create Contest'
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
