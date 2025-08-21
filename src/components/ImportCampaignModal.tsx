import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminToken } from '../utils/auth';

interface ImportCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contestId: number) => void;
}

interface CampaignData {
  name: string;
  description: string;
  day?: string;
  duration_days: number;
  entry_type?: string;
  reward_logic: {
    type: string;
    winner_reward: string;
    consolation_offer?: string;
  };
  messaging?: {
    initial_sms?: string;
    winner_sms?: string;
    non_winner_sms?: string;
    reminder_sms?: string;
  };
  promotion_channels?: string[];
  activation_hooks?: string[];
}

interface ImportResponse {
  success: boolean;
  contest_id?: number;
  message: string;
  warnings?: string[];
  fields_mapped?: Record<string, string>;
  fields_stored_in_metadata?: string[];
}

const ImportCampaignModal: React.FC<ImportCampaignModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [jsonContent, setJsonContent] = useState('');
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [overrides, setOverrides] = useState({
    location: '',
    start_time: '',
    active: false
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  const resetModal = () => {
    setStep('upload');
    setJsonContent('');
    setCampaignData(null);
    setOverrides({ location: '', start_time: '', active: false });
    setError(null);
    setUploadError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const validateCampaign = (data: any): string | null => {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return 'Campaign must have a name';
    }
    if (!data.description || typeof data.description !== 'string' || data.description.trim() === '') {
      return 'Campaign must have a description';
    }
    if (!data.duration_days || typeof data.duration_days !== 'number' || data.duration_days <= 0) {
      return 'Campaign must have a valid duration_days (positive number)';
    }
    if (!data.reward_logic || !data.reward_logic.winner_reward || typeof data.reward_logic.winner_reward !== 'string') {
      return 'Campaign must have reward_logic.winner_reward';
    }
    return null;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setUploadError('Please upload a JSON file');
      return;
    }

    // Validate file size (1MB limit)
    if (file.size > 1024 * 1024) {
      setUploadError('File size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Validate required fields
        const validationError = validateCampaign(parsed);
        if (validationError) {
          setUploadError(validationError);
          return;
        }
        
        setJsonContent(content);
        setCampaignData(parsed);
        setStep('preview');
      } catch (error) {
        setUploadError('Invalid JSON format. Please check your file syntax.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!campaignData) return;

    setStep('importing');
    setError(null);

    try {
      const payload = {
        campaign_json: campaignData,
        location: overrides.location || undefined,
        start_time: overrides.start_time || undefined,
        active: overrides.active
      };

      const token = getAdminToken();
      const response = await fetch(`${apiBaseUrl}/admin/contests/import-one-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result: ImportResponse = await response.json();

      if (response.ok && result.success) {
        if (onSuccess && result.contest_id) {
          onSuccess(result.contest_id);
        } else if (result.contest_id) {
          navigate(`/admin/contests/${result.contest_id}`);
        }
        handleClose();
      } else {
        setError(result.message || 'Import failed');
        setStep('preview');
      }
    } catch (error) {
      setError('Failed to import campaign. Please check your connection and try again.');
      setStep('preview');
    }
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Campaign JSON</h3>
                <p className="text-gray-500 mb-4">Select a .json file containing your campaign configuration</p>
                
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
              
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Sample Campaign JSON:</h4>
                <pre className="text-xs text-blue-800 bg-blue-100 p-3 rounded overflow-x-auto">
{`{
  "name": "Margarita Monday Mystery",
  "description": "Weekly margarita giveaway",
  "duration_days": 1,
  "reward_logic": {
    "type": "random_winner",
    "winner_reward": "Free margarita + taco"
  }
}`}
                </pre>
              </div>
            </div>
          )}
          
          {step === 'preview' && campaignData && (
            <div className="space-y-6">
              {/* Campaign Preview */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Campaign Preview</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div><span className="font-medium text-gray-700">Name:</span> {campaignData.name}</div>
                  <div><span className="font-medium text-gray-700">Description:</span> {campaignData.description}</div>
                  <div><span className="font-medium text-gray-700">Duration:</span> {campaignData.duration_days} day(s)</div>
                  <div><span className="font-medium text-gray-700">Prize:</span> {campaignData.reward_logic.winner_reward}</div>
                  {campaignData.day && <div><span className="font-medium text-gray-700">Day:</span> {campaignData.day}</div>}
                  {campaignData.reward_logic.consolation_offer && (
                    <div><span className="font-medium text-gray-700">Consolation:</span> {campaignData.reward_logic.consolation_offer}</div>
                  )}
                </div>
              </div>
              
              {/* Override Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Optional Overrides</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={overrides.location}
                      onChange={(e) => setOverrides(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Boulder, CO"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={overrides.start_time}
                      onChange={(e) => setOverrides(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={overrides.active}
                      onChange={(e) => setOverrides(prev => ({ ...prev, active: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                      Make contest active immediately
                    </label>
                  </div>
                </div>
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
              
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Import Campaign
                </button>
              </div>
            </div>
          )}
          
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Campaign...</h3>
              <p className="text-gray-600">Please wait while we create your contest</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportCampaignModal;
