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
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchApiHealth = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
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
