import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ImportCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contestId: number) => void;
}

const ImportCampaignModal: React.FC<ImportCampaignModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState<string>('');
  const [overrides, setOverrides] = useState({
    location: '',
    start_date: '',
    end_date: '',
    duration_days: ''
  });

  const resetModal = () => {
    setStep('upload');
    setJsonText('');
    setOverrides({ location: '', start_date: '', end_date: '', duration_days: '' });
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Smart date calculation logic
  const calculateDates = () => {
    const { start_date, end_date, duration_days } = overrides;
    
    if (start_date && end_date && duration_days) {
      // All three provided - validate consistency
      const start = new Date(start_date);
      const end = new Date(end_date);
      const calculatedDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (calculatedDuration !== parseInt(duration_days)) {
        setError(`Duration mismatch: ${start_date} to ${end_date} is ${calculatedDuration} days, not ${duration_days} days`);
        return false;
      }
      return true;
    } else if (start_date && duration_days && !end_date) {
      // Start + Duration → Calculate End
      const start = new Date(start_date);
      const end = new Date(start.getTime() + (parseInt(duration_days) * 24 * 60 * 60 * 1000));
      setOverrides(prev => ({ ...prev, end_date: end.toISOString().slice(0, 16) }));
      return true;
    } else if (end_date && duration_days && !start_date) {
      // End + Duration → Calculate Start
      const end = new Date(end_date);
      const start = new Date(end.getTime() - (parseInt(duration_days) * 24 * 60 * 60 * 1000));
      setOverrides(prev => ({ ...prev, start_date: start.toISOString().slice(0, 16) }));
      return true;
    } else if (start_date && end_date && !duration_days) {
      // Start + End → Calculate Duration
      const start = new Date(start_date);
      const end = new Date(end_date);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      setOverrides(prev => ({ ...prev, duration_days: duration.toString() }));
      return true;
    } else if (start_date && !end_date && !duration_days) {
      // Only Start → Default to 7 days
      const start = new Date(start_date);
      const end = new Date(start.getTime() + (7 * 24 * 60 * 60 * 1000));
      setOverrides(prev => ({ 
        ...prev, 
        end_date: end.toISOString().slice(0, 16),
        duration_days: '7'
      }));
      return true;
    } else if (!start_date && !end_date && !duration_days) {
      // Nothing provided → Default to tomorrow + 7 days
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM start
      
      const end = new Date(tomorrow.getTime() + (7 * 24 * 60 * 60 * 1000));
      setOverrides(prev => ({ 
        ...prev, 
        start_date: tomorrow.toISOString().slice(0, 16),
        end_date: end.toISOString().slice(0, 16),
        duration_days: '7'
      }));
      return true;
    }
    
    return true;
  };

  const validateCampaign = (data: any): string | null => {
    if (!data.name || typeof data.name !== 'string') {
      return 'Campaign must have a name';
    }
    if (!data.description || typeof data.description !== 'string') {
      return 'Campaign must have a description';
    }
    if (!data.reward_logic || typeof data.reward_logic !== 'object') {
      return 'Campaign must have reward_logic object';
    }
    
    // Check for either "winner_reward" or "reward" field
    const hasWinnerReward = data.reward_logic.winner_reward && typeof data.reward_logic.winner_reward === 'string';
    const hasReward = data.reward_logic.reward && typeof data.reward_logic.reward === 'string';
    
    if (!hasWinnerReward && !hasReward) {
      return 'Campaign must have reward_logic.winner_reward or reward_logic.reward';
    }
    
    // Normalize the field name for backend compatibility
    if (hasReward && !hasWinnerReward) {
      data.reward_logic.winner_reward = data.reward_logic.reward;
    }
    
    return null;
  };

  const handleJsonSubmit = () => {
    if (!jsonText.trim()) {
      setError('Please enter JSON content');
      return;
    }

    setError(null);

    try {
      const parsed = JSON.parse(jsonText);
      
      // Validate required fields
      const validationError = validateCampaign(parsed);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      // Calculate dates if needed
      if (!calculateDates()) {
        return;
      }
      
      // Store campaign data in sessionStorage to avoid URL length issues
      const campaignWithOverrides = {
        ...parsed,
        ...overrides,
        _isImported: true
      };

      // Store in sessionStorage instead of URL parameters
      sessionStorage.setItem('importedCampaign', JSON.stringify(campaignWithOverrides));
      
      // Navigate to new contest page without URL parameters
      navigate('/admin/contests/new?import=true');
      handleClose();
    } catch (error) {
      setError('Invalid JSON format. Please check your syntax.');
    }
  };

  const loadSampleJson = () => {
    const sampleJson = {
      "name": "Margarita Monday Mystery",
      "description": "Each Monday, one lucky SMS subscriber wins a margarita + taco combo. Others get smaller perks.",
      "day": "Monday",
      "entry_type": "SMS opt-in",
      "reward_logic": {
        "type": "random_winner",
        "winner_reward": "Free margarita + taco",
        "consolation_offer": "$2 off margaritas"
      },
      "messaging": {
        "initial_sms": "You're entered in Margarita Monday! Drawing every Monday at 5pm. Good luck!",
        "winner_sms": "🎉 YOU WON! Free margarita + taco combo waiting for you! Show this message to claim. Expires in 7 days.",
        "non_winner_sms": "Thanks for playing Margarita Monday! Here's 10% off your next visit: MONDAY10"
      },
      "promotion_channels": [
        "in-store signage",
        "Instagram",
        "SMS reminder"
      ],
      "activation_hooks": [
        "show_sms_for_offer",
        "winner_announcement_in_IG_story"
      ],
      "rules": [
        "Must be 18 or older to participate",
        "One entry per phone number",
        "Winner will be contacted via SMS"
      ],
      "requirements": [
        "Valid US phone number required",
        "Must opt-in to SMS marketing"
      ]
    };
    setJsonText(JSON.stringify(sampleJson, null, 2));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Import Campaign One-Sheet</h2>
            <p className="text-sm text-gray-600 mt-1">Upload a JSON campaign file to create a new contest</p>
          </div>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Campaign JSON Section */}
              <div className="border border-gray-300 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Campaign JSON</h3>
                  <button
                    onClick={loadSampleJson}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Load Sample
                  </button>
                </div>
                <p className="text-gray-500 mb-4">Paste or type your campaign JSON configuration below</p>
                
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`{
  "name": "Your Campaign Name",
  "description": "Campaign description",
  "reward_logic": {
    "type": "random_winner",
    "winner_reward": "Your reward"
  }
}`}
                  className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date & Location Overrides Section */}
              <div className="border border-gray-300 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📅 Contest Timing & Location</h3>
                <p className="text-gray-500 mb-4 text-sm">
                  Provide any combination of dates/duration. The system will calculate missing values automatically.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={overrides.start_date}
                      onChange={(e) => setOverrides(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={overrides.end_date}
                      onChange={(e) => setOverrides(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Duration Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={overrides.duration_days}
                      onChange={(e) => setOverrides(prev => ({ ...prev, duration_days: e.target.value }))}
                      placeholder="7"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Override
                    </label>
                    <input
                      type="text"
                      value={overrides.location}
                      onChange={(e) => setOverrides(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Online, United States, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Smart Calculation Info */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Smart Date Calculation:</p>
                      <ul className="mt-1 space-y-1">
                        <li>• <strong>Start + Duration</strong> → End date calculated</li>
                        <li>• <strong>End + Duration</strong> → Start date calculated</li>
                        <li>• <strong>Start + End</strong> → Duration calculated</li>
                        <li>• <strong>None provided</strong> → Defaults to tomorrow + 7 days</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Import Button */}
              <button
                onClick={handleJsonSubmit}
                disabled={!jsonText.trim()}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                📝 Import & Review in Form
              </button>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportCampaignModal;


