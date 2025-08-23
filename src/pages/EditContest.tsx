import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken } from '../utils/auth';
import { datetimeLocalToUTC, utcToDatetimeLocal, getAdminTimezone, getTimezoneDisplayName, getTimezoneAbbreviation } from '../utils/timezone';
import { deleteContest } from '../utils/adminApi';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';

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
  
  // New Image and Sponsor Fields
  image_url: string; // Contest hero image URL
  sponsor_url: string; // Sponsor website URL
  
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
    // Basic Information
    name: '',
    description: '',
    location: '',
    prize_description: '',
    start_date: '',
    end_date: '',
    prize_value: '',
    eligibility_text: '',
    
    // New Image and Sponsor Fields
    image_url: '',
    sponsor_url: '',
    
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
    sponsor_name: '',
    terms_url: '',
    official_start_date: '', // new field
    official_end_date: '' // new field
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
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

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';

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
          // Basic Information
          name: foundContest.name,
          description: foundContest.description,
          location: foundContest.location,
          prize_description: foundContest.prize_description,
          start_date: utcToDatetimeLocal(foundContest.start_time, adminTimezone),
          end_date: utcToDatetimeLocal(foundContest.end_time, adminTimezone),
          prize_value: foundContest.official_rules?.prize_value_usd?.toString() || '100',
          eligibility_text: foundContest.official_rules?.eligibility_text || 'Open to all participants. Must be 18 years or older.',
          
          // New Image and Sponsor Fields
          image_url: foundContest.image_url || '',
          sponsor_url: foundContest.sponsor_url || '',
          
          // Advanced Options - Extract from contest data or use defaults
          contest_type: (foundContest as any).contest_type || 'general',
          entry_method: (foundContest as any).entry_method || (foundContest as any).entry_type || 'sms', // renamed from entry_type
          winner_selection_method: (foundContest as any).winner_selection_method || 'random',
          minimum_age: ((foundContest as any).minimum_age || (foundContest as any).age_restriction || foundContest.official_rules?.age_restriction || '18').toString(), // renamed from age_restriction
          max_entries_per_person: ((foundContest as any).max_entries_per_person || (foundContest as any).entry_limit_per_person)?.toString() || '', // renamed from entry_limit_per_person
          total_entry_limit: (foundContest as any).total_entry_limit?.toString() || '',
          consolation_offer: (foundContest as any).consolation_offer || (foundContest as any).consolation_prize || '', // renamed from consolation_prize
          geographic_restrictions: (foundContest as any).geographic_restrictions || (foundContest as any).geographic_restriction || '', // renamed from geographic_restriction
          contest_tags: Array.isArray((foundContest as any).contest_tags) ? (foundContest as any).contest_tags.join(', ') : 
                       Array.isArray((foundContest as any).tags) ? (foundContest as any).tags.join(', ') : '',
          promotion_channels: Array.isArray((foundContest as any).promotion_channels) ? (foundContest as any).promotion_channels : [],
          
          // SMS Templates - Extract from sms_templates or messaging
          entry_confirmation_sms: (foundContest as any).sms_templates?.entry_confirmation || 
                                 (foundContest as any).messaging?.initial_sms || 
                                 '🎉 You\'re entered! Contest details: {contest_name}. Good luck!', // renamed from initial_sms_template
          winner_notification_sms: (foundContest as any).sms_templates?.winner_notification || 
                                  (foundContest as any).messaging?.winner_sms || 
                                  '🏆 Congratulations! You won: {prize_description}. Instructions: {claim_instructions}', // renamed from winner_sms_template
          non_winner_sms: (foundContest as any).sms_templates?.non_winner || 
                         (foundContest as any).messaging?.non_winner_sms || 
                         'Thanks for participating in {contest_name}! {consolation_offer}', // renamed from non_winner_sms_template
          
          // Legal Compliance
          sponsor_name: foundContest.official_rules?.sponsor_name || 'Contestlet',
          terms_url: foundContest.official_rules?.terms_url || 'https://contestlet.com/terms',
          official_start_date: foundContest.official_rules?.start_date ? 
            utcToDatetimeLocal(foundContest.official_rules.start_date, adminTimezone) : '', // new field
          official_end_date: foundContest.official_rules?.end_date ? 
            utcToDatetimeLocal(foundContest.official_rules.end_date, adminTimezone) : '' // new field
        });
        
        // Show advanced options if any advanced fields have non-default values
        const hasAdvancedData = (foundContest as any).contest_type || 
                               ((foundContest as any).entry_method || (foundContest as any).entry_type) !== 'sms' ||
                               (foundContest as any).winner_selection_method !== 'random' ||
                               (foundContest as any).consolation_offer || (foundContest as any).consolation_prize ||
                               (foundContest as any).max_entries_per_person || (foundContest as any).entry_limit_per_person ||
                               (foundContest as any).total_entry_limit ||
                               (foundContest as any).geographic_restrictions || (foundContest as any).geographic_restriction ||
                               (foundContest as any).promotion_channels?.length > 0 ||
                               (foundContest as any).contest_tags?.length > 0 || (foundContest as any).tags?.length > 0 ||
                               (foundContest as any).sms_templates ||
                               (foundContest as any).official_rules?.start_date ||
                               (foundContest as any).official_rules?.end_date;
        
        if (hasAdvancedData) {
          setShowAdvancedOptions(true);
        }

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
    const { name, value } = e.target;
    
    // Ensure value is always a string to prevent React controlled/uncontrolled issues
    const safeValue = value || '';
    
    setFormData(prev => ({
      ...prev,
      [name]: safeValue
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
      
      // Prepare official rules dates (use contest dates if not specified)
      const officialStartDate = formData.official_start_date ? 
        datetimeLocalToUTC(formData.official_start_date, adminTimezone) : startTime;
      const officialEndDate = formData.official_end_date ? 
        datetimeLocalToUTC(formData.official_end_date, adminTimezone) : endTime;

      const payload = {
        // Basic Information (8 required fields)
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        prize_description: formData.prize_description.trim() || undefined,
        start_time: startTime,
        end_time: endTime,
        
        // New Image and Sponsor Fields
        image_url: formData.image_url.trim() || '',
        sponsor_url: formData.sponsor_url.trim() || '',
        
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

      console.log('Updating contest with payload:', payload);
      console.log('Using admin token:', adminToken.substring(0, 20) + '...');
      console.log('🔍 PAYLOAD IMAGE URL DEBUG:');
      console.log('  - Payload image_url:', payload.image_url);
      console.log('  - Payload image_url type:', typeof payload.image_url);
      console.log('  - Full payload object:', JSON.stringify(payload, null, 2));
      console.log('🔍 END PAYLOAD IMAGE URL DEBUG');

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
      console.log('🔍 RESPONSE IMAGE URL DEBUG:');
      console.log('  - Response status:', response.status);
      console.log('  - Response result image_url:', result.image_url);
      console.log('  - Response result image_url type:', typeof result.image_url);
      console.log('  - COMPARISON: What we sent vs what we got back:');
      console.log('    Sent image_url:', payload.image_url);
      console.log('    Got back image_url:', result.image_url);
      console.log('    Sent sponsor_url:', payload.sponsor_url);
      console.log('    Got back sponsor_url:', result.sponsor_url);
      console.log('🔍 END RESPONSE IMAGE URL DEBUG');
      
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
              console.log('  Previous image_url:', prev.image_url);
              console.log('  Backend response image_url:', updatedContest.image_url);
              console.log('  Backend response sponsor_url:', updatedContest.sponsor_url);
              
              const newData = {
                ...prev,
                start_date: convertedStartDate,
                end_date: convertedEndDate,
                // Preserve user's input for image and sponsor fields
                // Convert null/undefined to empty strings to prevent React controlled/uncontrolled issues
                image_url: updatedContest.image_url || prev.image_url || '',
                sponsor_url: updatedContest.sponsor_url || prev.sponsor_url || '',
              };
              
              console.log('  New form data:', newData);
              console.log('  Final image_url:', newData.image_url);
              console.log('  Final sponsor_url:', newData.sponsor_url);
              console.log('  Complete new form data:', JSON.stringify(newData, null, 2));
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
                required
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe who is eligible to enter this contest"
              />
            </div>

            {/* Contest Image/Video */}
            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-2">
                Contest Hero Image/Video URL (Optional)
              </label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/contest-hero.jpg or https://example.com/contest-video.mp4"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                🖼️ Enter a URL to an image (JPG, PNG, GIF) or video (MP4). 
                For images: 1:1 aspect ratio recommended. For videos: MP4 format with autoplay, loop, and muted.
              </p>
              {formData.image_url && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <div className="w-32 h-32 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                    {formData.image_url.toLowerCase().endsWith('.mp4') ? (
                      <video
                        src={formData.image_url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        onError={(e) => {
                          const target = e.target as HTMLVideoElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-gray-500">Invalid video URL</div>';
                        }}
                      />
                    ) : (
                      <img
                        src={formData.image_url}
                        alt="Contest preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-gray-500">Invalid image URL</div>';
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sponsor Website URL */}
            <div>
              <label htmlFor="sponsor_url" className="block text-sm font-medium text-gray-700 mb-2">
                Sponsor Website URL (Optional)
              </label>
              <input
                type="url"
                id="sponsor_url"
                name="sponsor_url"
                value={formData.sponsor_url}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Link to your sponsor's website for more information.
              </p>
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
Permanently remove this contest and all associated data
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
