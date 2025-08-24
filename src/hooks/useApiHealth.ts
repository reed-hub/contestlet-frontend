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
    loading: false,
    error: null,
  });

  useEffect(() => {
    const isStaging = window.location.hostname === 'staging-app.contestlet.com';
    
    if (isStaging) {
      // Test if CORS is resolved by attempting a health check
      console.log('🧪 Testing CORS status on staging...');
      
      const testCorsAndHealth = async () => {
        try {
          setState(prev => ({ ...prev, loading: true, error: null }));
          
          const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
          console.log('🔍 Testing API health on staging:', apiBaseUrl);
          
          const response = await fetch(`${apiBaseUrl}/`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data: ApiHealthResponse = await response.json();
          console.log('✅ CORS resolved! API health working on staging');
          
          setState({
            data,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.log('❌ CORS still blocked on staging, using fallback status');
          
          // Set a specific status for staging instead of unknown
          setState({
            data: { 
              status: 'staging', 
              message: 'Staging environment - CORS health checks disabled' 
            },
            loading: false,
            error: null,
          });
        }
      };

      testCorsAndHealth();
      return;
    }

    // Normal health check for non-staging environments
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
