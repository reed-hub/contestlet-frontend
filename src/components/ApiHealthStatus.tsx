import React from 'react';
import { useApiHealth } from '../hooks/useApiHealth';

const ApiHealthStatus: React.FC = () => {
  const { data, loading, error } = useApiHealth();

  const getStatusColor = () => {
    if (loading) return 'text-yellow-600';
    if (error) return 'text-red-600';
    if (data?.status === 'ok' || data?.status === 'healthy') return 'text-green-600';
    if (data?.status === 'staging') return 'text-blue-600'; // Blue for staging
    return 'text-orange-600';
  };

  const getStatusIcon = () => {
    if (loading) {
      return (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    if (error) {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    
    if (data?.status === 'ok' || data?.status === 'healthy') {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getDisplayText = () => {
    if (loading) return 'Checking API...';
    if (error) return `API Error: ${error}`;
    if (data) {
      // Handle staging environment status
      if (data.status === 'staging') {
        return `Staging Environment: ${data.message}`;
      }
      return `API ${data.status}: ${data.message}`;
    }
    return 'API status unknown';
  };

  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2">
      <div className="max-w-7xl mx-auto">
        <div className={`flex items-center space-x-2 text-sm ${getStatusColor()}`}>
          {getStatusIcon()}
          <span>{getDisplayText()}</span>
        </div>
      </div>
    </div>
  );
};

export default ApiHealthStatus;
