import { useState, useEffect } from 'react';

interface ApiHealthResponse {
  status: string;
  message: string;
}

interface ApiHealthState {
  data: ApiHealthResponse | null;
  loading: boolean;
  error: string | null;
}

export const useApiHealth = () => {
  const [state, setState] = useState<ApiHealthState>({
    data: null,
    loading: false, // Changed to false to prevent loading state
    error: null,
  });

  useEffect(() => {
    // TEMPORARY FIX: Disable API health checks on staging to prevent CORS errors
    // TODO: Remove this when backend CORS is fixed
    const isStaging = window.location.hostname === 'staging-app.contestlet.com';
    
    if (isStaging) {
      console.log('🚨 API health checks disabled on staging due to CORS issues');
      console.log('🔧 Backend team needs to add CORS origin: https://staging-app.contestlet.com');
      return;
    }

    const fetchApiHealth = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';
        const response = await fetch(`${apiBaseUrl}/`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ApiHealthResponse = await response.json();
        setState({
          data,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch API health',
        });
      }
    };

    fetchApiHealth();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return state;
};
