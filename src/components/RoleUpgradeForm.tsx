import React, { useState } from 'react';
import { apiClient } from '../utils/apiClient';

export function RoleUpgradeForm() {
  const [formData, setFormData] = useState({
    company_name: '',
    website_url: '',
    industry: '',
    description: '',
    verification_document_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiClient.requestSponsorUpgrade({
        target_role: 'sponsor',
        ...formData
      });

      setMessage({
        type: 'success',
        text: 'Sponsor upgrade request submitted! Please wait for admin approval.'
      });
      
      // Clear form
      setFormData({
        company_name: '',
        website_url: '',
        industry: '',
        description: '',
        verification_document_url: ''
      });
      
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to submit upgrade request. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Upgrade to Sponsor Account</h2>
        <p className="mt-2 text-gray-600">
          Create contests and manage your company profile. This request will be reviewed by our admin team.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            required
            value={formData.company_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your company name"
          />
        </div>

        <div>
          <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <input
            id="website_url"
            name="website_url"
            type="url"
            value={formData.website_url}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://yourcompany.com"
          />
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
            Industry
          </label>
          <input
            id="industry"
            name="industry"
            type="text"
            value={formData.industry}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Technology, Healthcare, Retail"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Company Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us about your company and what you do..."
          />
        </div>

        <div>
          <label htmlFor="verification_document_url" className="block text-sm font-medium text-gray-700 mb-2">
            Verification Document URL
          </label>
          <input
            id="verification_document_url"
            name="verification_document_url"
            type="url"
            value={formData.verification_document_url}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com/document.pdf"
          />
          <p className="mt-1 text-sm text-gray-500">
            Optional: Provide a link to a business document for verification (business license, website, etc.)
          </p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Request Sponsor Upgrade'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Your request will be reviewed by our admin team</li>
          <li>• We'll verify your company information</li>
          <li>• You'll receive an email notification once approved</li>
          <li>• After approval, you can create and manage contests</li>
        </ul>
      </div>
    </div>
  );
}

export default RoleUpgradeForm;
