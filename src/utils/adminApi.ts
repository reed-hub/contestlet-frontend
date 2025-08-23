// Admin API utility functions for Contestlet

import { getAdminToken } from './auth';

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || '';
};

/**
 * Delete a contest
 * @param contestId - Contest ID to delete
 * @returns Promise with success status and message
 */
export const deleteContest = async (contestId: string | number): Promise<{
  success: boolean;
  message: string;
}> => {
  console.log('🔍 DELETE CONTEST DEBUG START');
  console.log('  - Contest ID:', contestId);
  console.log('  - Contest ID type:', typeof contestId);
  console.log('  - API Base URL:', getApiBaseUrl());
  
  try {
    const adminToken = getAdminToken();
    console.log('  - Admin token exists:', !!adminToken);
    console.log('  - Admin token preview:', adminToken ? `${adminToken.substring(0, 20)}...` : 'NO TOKEN');
    
    if (!adminToken) {
      throw new Error('Admin authentication required');
    }

    const requestUrl = `${getApiBaseUrl()}/admin/contests/${contestId}`;
    console.log('  - Request URL:', requestUrl);
    console.log('  - Request method: DELETE');
    console.log('  - Request headers:', {
      'Authorization': `Bearer ${adminToken.substring(0, 20)}...`,
      'Content-Type': 'application/json',
    });

    const response = await fetch(requestUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('  - Response received');
    console.log('  - Response status:', response.status);
    console.log('  - Response status text:', response.statusText);
    console.log('  - Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('  - Response URL:', response.url);

    if (!response.ok) {
      console.log('  - ❌ Response not OK, handling error...');
      
      if (response.status === 401) {
        console.log('  - 401: Authentication failed');
        throw new Error('Authentication failed. Please log in again.');
      } else if (response.status === 403) {
        console.log('  - 403: Access denied');
        throw new Error('Access denied. Admin privileges required.');
      } else if (response.status === 404) {
        console.log('  - 404: Contest not found');
        throw new Error('Contest not found. It may have already been deleted.');
      } else if (response.status === 405) {
        console.log('  - 405: Method not allowed');
        throw new Error('Contest deletion is not yet supported by the backend API. Please contact the backend team to implement DELETE /admin/contests/{id}.');
      } else if (response.status === 409) {
        console.log('  - 409: Conflict - trying to get specific error details');
        // Try to get more specific error details from the backend
        const errorData = await response.json().catch(() => null);
        console.log('  - Error response data:', errorData);
        const specificMessage = errorData?.message || errorData?.detail;
        
        if (specificMessage) {
          throw new Error(specificMessage);
        } else {
          throw new Error('Cannot delete contest. It may have active entries, be currently active, or be in a protected state.');
        }
      } else {
        console.log('  - Other error status, trying to get error details');
        const errorData = await response.json().catch(() => null);
        console.log('  - Error response data:', errorData);
        const message = errorData?.message || errorData?.detail || `Server error (${response.status})`;
        throw new Error(message);
      }
    }

    console.log('  - ✅ Response OK, parsing result...');
    const result = await response.json();
    console.log('  - Success response data:', result);
    
    console.log('🔍 DELETE CONTEST DEBUG END - SUCCESS');
    return {
      success: true,
      message: result.message || 'Contest deleted successfully',
    };

  } catch (error) {
    console.log('  - ❌ Exception caught during delete');
    console.log('  - Error type:', typeof error);
    console.log('  - Error message:', error instanceof Error ? error.message : String(error));
    console.log('  - Full error object:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('  - 🔍 This appears to be a network/fetch error');
      console.log('  - Possible causes:');
      console.log('    * Backend server not running');
      console.log('    * CORS issues');
      console.log('    * Network connectivity problems');
      console.log('    * Invalid URL format');
    }
    
    console.log('🔍 DELETE CONTEST DEBUG END - FAILURE');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete contest',
    };
  }
};
