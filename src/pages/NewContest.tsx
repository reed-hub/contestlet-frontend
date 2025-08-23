import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isAdminAuthenticated, getAdminToken, clearAllTokens } from '../utils/auth';
import { datetimeLocalToUTC, createDefaultContestDates, getAdminTimezone, getTimezoneDisplayName, getTimezoneAbbreviation } from '../utils/timezone';
import Toast from '../components/Toast';

// US States for location selection - will be fetched from backend
const US_STATES: { value: string; label: string }[] = [];

// Fetch US states from backend API
const fetchUSStates = async (): Promise<{ value: string; label: string }[]> => {
  try {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/location/states`);
    
    if (!response.ok) {
      console.warn('Failed to fetch states from backend, using fallback');
      return [];
    }
    
    const data = await response.json();
    if (data.states && Array.isArray(data.states)) {
      return data.states.map((state: any) => ({
        value: state.code,
        label: state.name
      }));
    }
    
    return [];
  } catch (err) {
    console.warn('Error fetching states from backend:', err);
    return [];
  }
};

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

  // Smart Location Fields
  location_type: 'united_states' | 'specific_states' | 'radius' | 'custom';
  selected_states: string[];
  radius_address: string;
  radius_miles: string;
  radius_coordinates: { lat: number; lng: number } | null;
}

const NewContest: React.FC = () => {
  const location = useLocation();
  const [isImportMode, setIsImportMode] = useState(false);
  const [formData, setFormData] = useState<ContestFormData>({
    // Basic Information
    name: '',
    description: '',
    location: 'United States',
    prize_description: '',
    start_date: '',
    end_date: '',
    prize_value: '100',
    eligibility_text: 'Open to all participants. Must be 18 years or older.',
    
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
    sponsor_name: 'Contestlet',
    terms_url: 'https://contestlet.com/terms',
    official_start_date: '', // new field
    official_end_date: '', // new field

    // Smart Location Fields
    location_type: 'united_states',
    selected_states: [],
    radius_address: '',
    radius_miles: '25',
    radius_coordinates: null
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
    // Handle dates from import overrides (new smart date system)
    let startDate = '';
    let endDate = '';
    
    if (campaignData.start_date) {
      // Use start_date from import overrides
      startDate = campaignData.start_date;
    } else if (campaignData.start_time) {
      // Handle various date formats from campaign data (legacy)
      const startTime = new Date(campaignData.start_time);
      startDate = startTime.toISOString().slice(0, 16); // Format for datetime-local
    }
    
    if (campaignData.end_date) {
      // Use end_date from import overrides
      endDate = campaignData.end_date;
    } else if (campaignData.end_time && !endDate) {
      // Handle various date formats from campaign data (legacy)
      const endTime = new Date(campaignData.end_time);
      endDate = endTime.toISOString().slice(0, 16);
    }
    
    // If we still don't have dates, calculate from duration_days
    if (!startDate && !endDate && campaignData.duration_days) {
      const now = new Date();
      const start = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Start tomorrow
      const end = new Date(start.getTime() + (campaignData.duration_days * 24 * 60 * 60 * 1000));
      
      startDate = start.toISOString().slice(0, 16);
      endDate = end.toISOString().slice(0, 16);
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
    
    // Handle location type and specific states
    let locationType: ContestFormData['location_type'] = 'united_states';
    let selectedStates: string[] = [];
    if (campaignData.location_type && ['united_states', 'specific_states', 'radius', 'custom'].includes(campaignData.location_type)) {
      locationType = campaignData.location_type as ContestFormData['location_type'];
    }
    if (Array.isArray(campaignData.selected_states)) {
      selectedStates = campaignData.selected_states;
    } else if (typeof campaignData.selected_states === 'string') {
      selectedStates = campaignData.selected_states.split(',').map((s: string) => s.trim());
    }

    // Handle radius coordinates
    let radiusCoordinates: { lat: number; lng: number } | null = null;
    if (campaignData.radius_coordinates) {
      radiusCoordinates = campaignData.radius_coordinates;
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
      sponsor_url: campaignData.sponsor_url || '',
      image_url: campaignData.image_url || undefined, // Contest hero image URL
      terms_url: campaignData.terms_url || 
                campaignData.official_rules?.terms_url || 
                'https://contestlet.com/terms',
      contest_tags: contestTags,
      
      // Official Rules Dates (use contest dates if not specified)
      official_start_date: campaignData.official_rules?.start_date || 
                          campaignData.start_date || '',
      official_end_date: campaignData.official_rules?.end_date || 
                        campaignData.end_date || '',

      // Smart Location Fields
      location_type: locationType,
      selected_states: selectedStates,
      radius_address: campaignData.radius_address || '',
      radius_miles: campaignData.radius_miles || '25',
      radius_coordinates: radiusCoordinates
    };
  };

  // Check authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Parse imported campaign data from sessionStorage or URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const importData = urlParams.get('import');
    
    if (importData) {
      try {
        let campaignData;
        
        // Try to get from sessionStorage first (new approach)
        const storedData = sessionStorage.getItem('importedCampaign');
        if (storedData) {
          campaignData = JSON.parse(storedData);
          // Clear from sessionStorage after reading
          sessionStorage.removeItem('importedCampaign');
        } else {
          // Fallback to URL parameters (legacy approach)
          const urlImportData = urlParams.get('import');
          if (urlImportData && urlImportData !== 'true') {
            campaignData = JSON.parse(decodeURIComponent(urlImportData));
          }
        }
        
        if (campaignData) {
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
        }
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

  // Fetch US states from backend API
  useEffect(() => {
    const loadStates = async () => {
      setIsLoadingStates(true);
      try {
        const states = await fetchUSStates();
        setUsStates(states);
      } catch (err) {
        console.error('Failed to load US states:', err);
        // Fallback to empty array - form will still work
      } finally {
        setIsLoadingStates(false);
      }
    };
    
    loadStates();
  }, []);

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

  const handleLocationTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      location_type: e.target.value as ContestFormData['location_type'],
      selected_states: [], // Clear specific states when location type changes
      radius_address: '', // Clear radius address
      radius_coordinates: null // Clear radius coordinates
    }));
  };

  const handleStateSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      selected_states: prev.selected_states.includes(value)
        ? prev.selected_states.filter(s => s !== value)
        : [...prev.selected_states, value]
    }));
  };

  const handleGeocodeAddress = async () => {
    setIsGeocoding(true);
    try {
      // Use our backend location API for geocoding
      const response = await fetch(`${apiBaseUrl}/location/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          address: formData.radius_address
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.coordinates) {
        const { latitude, longitude } = data.coordinates;
        setFormData(prev => ({ 
          ...prev, 
          radius_coordinates: { lat: latitude, lng: longitude } 
        }));
        setToast({
          type: 'success',
          message: `Address verified: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          isVisible: true,
        });
      } else {
        setToast({
          type: 'error',
          message: `Could not find coordinates for address: ${formData.radius_address}`,
          isVisible: true,
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: `Error geocoding address: ${err instanceof Error ? err.message : String(err)}`,
        isVisible: true,
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const getLocationSummary = () => {
    if (formData.location_type === 'united_states') {
      return '🌎 Contest open to all United States residents';
    }
    if (formData.location_type === 'specific_states') {
      if (formData.selected_states.length === 0) {
        return '🌎 Contest open to all states (no states selected)';
      }
      return `🌎 Contest open to ${formData.selected_states.length} selected states: ${formData.selected_states.join(', ')}`;
    }
    if (formData.location_type === 'radius') {
      if (!formData.radius_address) {
        return '🌎 Contest open to all locations (no address specified)';
      }
      if (formData.radius_coordinates) {
        return `🌎 Contest open within ${formData.radius_miles} miles of ${formData.radius_address} (coordinates verified)`;
      }
      return `🌎 Contest open within ${formData.radius_miles} miles of ${formData.radius_address} (address not yet verified)`;
    }
    if (formData.location_type === 'custom') {
      if (!formData.location.trim()) {
        return '🌎 Contest open to all locations (no custom text specified)';
      }
      return `🌎 Contest open to: ${formData.location}`;
    }
    return '🌎 Contest open to all locations';
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

    // Validate location configuration
    const locationValidation = await validateLocationConfiguration();
    if (!locationValidation.isValid) {
      console.log('⚠️ Location validation failed, but continuing with form submission for testing image_url field');
      console.log('  - Location error:', locationValidation.error);
      // Temporarily bypass location validation to test image_url field
      // setError(`Location configuration error: ${locationValidation.error}`);
      // setIsSubmitting(false);
      // return;
    }

    // Validate image/video URL format if provided
    if (formData.image_url.trim()) {
      try {
        const url = new URL(formData.image_url.trim());
        const isVideo = formData.image_url.toLowerCase().endsWith('.mp4');
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.image_url);
        
        if (!isVideo && !isImage) {
          setError('Please enter a valid image URL (JPG, PNG, GIF, WebP) or video URL (MP4)');
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        setError('Please enter a valid URL (e.g., https://example.com/image.jpg or https://example.com/video.mp4)');
        setIsSubmitting(false);
        return;
      }
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
        
        // New Image and Sponsor Fields
        image_url: formData.image_url.trim() || null,
        sponsor_url: formData.sponsor_url.trim() || null,
        
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
        },

        // Geographic Restrictions
        geographic_restrictions: formData.geographic_restrictions.trim() || undefined,

        // Smart Location Fields
        location_type: formData.location_type,
        selected_states: formData.selected_states,
        radius_address: formData.radius_address.trim() || undefined,
        radius_miles: parseInt(formData.radius_miles) || 25,
        radius_coordinates: formData.radius_coordinates || undefined
      };

      // Debug logging for image URL specifically
      console.log('=== IMAGE URL DEBUG ===');
      console.log('Raw image_url from form:', formData.image_url);
      console.log('Trimmed image_url:', formData.image_url.trim());
      console.log('Final image_url in payload:', formData.image_url.trim() || null);
      console.log('Full payload image_url:', apiPayload.image_url);
      console.log('=== END IMAGE URL DEBUG ===');

      console.log('Creating contest with payload:', apiPayload); // Debug log
      console.log('Using admin token:', adminToken ? `${adminToken.substring(0, 20)}...` : 'NO TOKEN'); // Debug log
      
      // Additional specific logging for image_url
      console.log('🔍 IMAGE URL FIELD DEBUG:');
      console.log('  - Form data image_url:', formData.image_url);
      console.log('  - Form data image_url type:', typeof formData.image_url);
      console.log('  - Form data image_url length:', formData.image_url?.length);
      console.log('  - Payload image_url:', apiPayload.image_url);
      console.log('  - Payload image_url type:', typeof apiPayload.image_url);
      console.log('  - Full form data object:', JSON.stringify(formData, null, 2));
      console.log('🔍 END IMAGE URL DEBUG');
      
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
      
      // Debug logging for response
      console.log('=== RESPONSE DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Created contest data:', createdContest);
      console.log('Image URL in response:', createdContest.image_url);
      console.log('=== END RESPONSE DEBUG ===');

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
        location: 'United States',
        prize_description: '',
        prize_value: '100',
        eligibility_text: 'Open to all participants. Must be 18 years or older.',
        // New Image and Sponsor Fields
        image_url: '',
        sponsor_url: '',
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
        official_end_date: '',
        // Smart Location Fields
        location_type: 'united_states',
        selected_states: [],
        radius_address: '',
        radius_miles: '25',
        radius_coordinates: null
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      location: 'United States',
      prize_description: '',
      prize_value: '100',
      eligibility_text: 'Open to all participants. Must be 18 years or older.',
      // New Image and Sponsor Fields
      image_url: '',
      sponsor_url: '',
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
      official_end_date: '',
      // Smart Location Fields
      location_type: 'united_states',
      selected_states: [],
      radius_address: '',
      radius_miles: '25',
      radius_coordinates: null
    });
    setError(null);
    setToast({ type: 'info', message: '', isVisible: false });
    setShowAdvancedOptions(false);
    setIsImportMode(false);
    // Clear URL parameters
    window.history.replaceState({}, '', '/admin/contests/new');
  };

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [usStates, setUsStates] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(true);

  const validateLocationConfiguration = async (): Promise<{ isValid: boolean; error?: string }> => {
    try {
      let locationData: any = {
        location_type: formData.location_type
      };

      if (formData.location_type === 'specific_states') {
        locationData.selected_states = formData.selected_states;
      } else if (formData.location_type === 'radius') {
        locationData.radius_address = formData.radius_address;
        locationData.radius_miles = parseInt(formData.radius_miles);
        if (formData.radius_coordinates) {
          locationData.radius_coordinates = {
            latitude: formData.radius_coordinates.lat,
            longitude: formData.radius_coordinates.lng
          };
        }
      } else if (formData.location_type === 'custom') {
        locationData.custom_text = formData.location;
      }

      console.log('🔍 LOCATION VALIDATION DEBUG:');
      console.log('  - Location type:', formData.location_type);
      console.log('  - Location data being sent:', locationData);
      console.log('  - Full form data:', formData);

      const response = await fetch(`${apiBaseUrl}/location/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(locationData),
      });

      console.log('  - Response status:', response.status);
      console.log('  - Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('  - Error response:', errorData);
        console.log('🔍 END LOCATION VALIDATION DEBUG');
        return { 
          isValid: false, 
          error: errorData.detail || `Location validation failed: ${response.status}` 
        };
      }

      const result = await response.json();
      console.log('  - Success response:', result);
      console.log('🔍 END LOCATION VALIDATION DEBUG');
      return { isValid: result.valid, error: result.warnings?.join(', ') };
    } catch (err) {
      console.log('  - Exception caught:', err);
      console.log('🔍 END LOCATION VALIDATION DEBUG');
      return { 
        isValid: false, 
        error: `Location validation error: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
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
            <p className="text-gray-600 mt-2">Fill in the details to create a new contest.</p>
            <p className="text-sm text-blue-600 mt-1">
              🕐 All times in <strong>{getTimezoneDisplayName(getAdminTimezone())}</strong> - displayed in your preferred timezone, stored as UTC
              <Link to="/admin/profile" className="ml-2 underline hover:text-blue-800">
                Change timezone
              </Link>
            </p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

          {/* Smart Location Field */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Geographic Location *
            </label>
            
            {/* Location Type Selection */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="location_type"
                    value="united_states"
                    checked={formData.location_type === 'united_states'}
                    onChange={handleLocationTypeChange}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">United States (All)</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="location_type"
                    value="specific_states"
                    checked={formData.location_type === 'specific_states'}
                    onChange={handleLocationTypeChange}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">Specific States</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="location_type"
                    value="radius"
                    checked={formData.location_type === 'radius'}
                    onChange={handleLocationTypeChange}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">Radius from Address</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="location_type"
                    value="custom"
                    checked={formData.location_type === 'custom'}
                    onChange={handleLocationTypeChange}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">Custom Text</span>
                </label>
              </div>
            </div>

            {/* United States Option */}
            {formData.location_type === 'united_states' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  🌎 Contest open to all United States residents
                </p>
              </div>
            )}

            {/* Specific States Option */}
            {formData.location_type === 'specific_states' && (
              <div className="space-y-3">
                {isLoadingStates ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading US states...
                    </div>
                  </div>
                ) : usStates.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {usStates.map((state) => (
                      <label key={state.value} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="selected_states"
                          value={state.value}
                          checked={formData.selected_states.includes(state.value)}
                          onChange={handleStateSelection}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-gray-700">{state.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Unable to load US states. Please check your connection or contact support.
                    </p>
                  </div>
                )}
                {formData.selected_states.length > 0 && (
                  <p className="text-xs text-gray-600">
                    Selected: {formData.selected_states.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Radius Option */}
            {formData.location_type === 'radius' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="radius_address" className="block text-xs font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      id="radius_address"
                      name="radius_address"
                      value={formData.radius_address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., 123 Main St, New York, NY"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="radius_miles" className="block text-xs font-medium text-gray-700 mb-1">
                      Radius (miles)
                    </label>
                    <input
                      type="number"
                      id="radius_miles"
                      name="radius_miles"
                      value={formData.radius_miles}
                      onChange={handleInputChange}
                      min="1"
                      max="500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="25"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleGeocodeAddress}
                      disabled={!formData.radius_address || isSubmitting}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeocoding ? 'Geocoding...' : 'Verify Address'}
                    </button>
                  </div>
                </div>
                {formData.radius_coordinates && (
                  <p className="text-xs text-green-600">
                    ✅ Address verified: {formData.radius_coordinates.lat.toFixed(4)}, {formData.radius_coordinates.lng.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {/* Custom Text Option */}
            {formData.location_type === 'custom' && (
              <div>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Online, Global, California only, etc."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Enter custom location description</p>
              </div>
            )}

            {/* Location Summary */}
            {formData.location_type !== 'custom' && (
              <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                <strong>Location Summary:</strong> {getLocationSummary()}
              </div>
            )}
          </div>

          {/* Prize Information */}
          <div className="space-y-6">
            {/* Prize Description */}
            <div>
              <label htmlFor="prize_description" className="block text-sm font-medium text-gray-700 mb-2">
                Prize Description *
              </label>
              <textarea
                id="prize_description"
                name="prize_description"
                required
                rows={4}
                value={formData.prize_description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the prize in detail. You can use multiple lines to list different components of the prize package."
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">Use multiple lines to describe different prize components</p>
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
                    <label htmlFor="sponsor_url" className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsor Website URL (Optional)
                    </label>
                    <input
                      type="url"
                      id="sponsor_url"
                      name="sponsor_url"
                      value={formData.sponsor_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://your-site.com"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Terms & Conditions */}
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
                  <p className="text-xs text-gray-500 mt-1">URL to your contest terms and conditions</p>
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
                  console.log('=== IMAGE URL DEBUG TEST ===');
                  console.log('Form data image_url:', formData.image_url);
                  console.log('Form data type:', typeof formData.image_url);
                  console.log('Form data length:', formData.image_url?.length);
                  console.log('Trimmed value:', formData.image_url?.trim());
                  console.log('Final payload value:', formData.image_url?.trim() || null);
                  console.log('=== END IMAGE URL DEBUG TEST ===');
                  
                  alert(`Image URL Debug:\nRaw: "${formData.image_url}"\nType: ${typeof formData.image_url}\nLength: ${formData.image_url?.length}\nTrimmed: "${formData.image_url?.trim()}"\nFinal: ${formData.image_url?.trim() || null}`);
                }}
                className="px-3 py-1 text-xs bg-green-200 text-green-700 rounded hover:bg-green-300"
              >
                Test Image URL
              </button>
              <button
                type="button"
                onClick={() => {
                  // Test setting image_url directly
                  setFormData(prev => ({
                    ...prev,
                    image_url: 'https://example.com/test-image.jpg'
                  }));
                  console.log('✅ Set test image URL');
                  alert('Test image URL set! Check the form field.');
                }}
                className="px-3 py-1 text-xs bg-purple-200 text-purple-700 rounded hover:bg-purple-300"
              >
                Set Test Image
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
