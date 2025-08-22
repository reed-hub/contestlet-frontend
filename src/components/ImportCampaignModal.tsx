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
    start_time: ''
  });

  const resetModal = () => {
    setStep('upload');
    setJsonText('');
    setOverrides({ location: '', start_time: '' });
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const validateCampaign = (data: any): string | null => {
    if (!data.name || typeof data.name !== 'string') {
      return 'Campaign must have a name';
    }
    if (!data.description || typeof data.description !== 'string') {
      return 'Campaign must have a description';
    }
    if (!data.duration_days || typeof data.duration_days !== 'number') {
      return 'Campaign must have duration_days as a number';
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
      
      // Skip preview step - go directly to form
      const campaignWithOverrides = {
        ...parsed,
        ...overrides,
        _isImported: true
      };

      const encodedData = encodeURIComponent(JSON.stringify(campaignWithOverrides));
      navigate(`/admin/contests/new?import=${encodedData}`);
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
      "duration_days": 1,
      "entry_type": "SMS opt-in",
      "reward_logic": {
        "type": "random_winner",
        "winner_reward": "Free margarita + taco",
        "consolation_offer": "$2 off margaritas"
      },
      "messaging": {
        "initial_sms": "You're in! Margarita Monday winner announced tonight 🍹",
        "winner_sms": "🎉 You won Margarita Monday! Come in for your free drink + taco.",
        "non_winner_sms": "No win this week—but enjoy $2 off margaritas tonight 🍹"
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
  "duration_days": 1,
  "reward_logic": {
    "type": "random_winner",
    "winner_reward": "Your reward"
  }
}`}
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <button
                  onClick={handleJsonSubmit}
                  disabled={!jsonText.trim()}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  📝 Import & Review in Form
                </button>
              </div>
              
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


