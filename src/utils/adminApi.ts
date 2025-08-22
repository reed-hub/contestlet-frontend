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
  try {
    const adminToken = getAdminToken();
    if (!adminToken) {
      throw new Error('Admin authentication required');
    }

    const response = await fetch(`${getApiBaseUrl()}/admin/contests/${contestId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
          } else if (response.status === 403) {
      throw new Error('Access denied. Admin privileges required.');
    } else if (response.status === 404) {
      throw new Error('Contest not found. It may have already been deleted.');
    } else if (response.status === 405) {
      throw new Error('Contest deletion is not yet supported by the backend API. Please contact the backend team to implement DELETE /admin/contests/{id}.');
    } else if (response.status === 409) {
      // Try to get more specific error details from the backend
      const errorData = await response.json().catch(() => null);
      const specificMessage = errorData?.message || errorData?.detail;
      
      if (specificMessage) {
        throw new Error(specificMessage);
      } else {
        throw new Error('Cannot delete contest. It may have active entries, be currently active, or be in a protected state.');
      }
    } else {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.message || errorData?.detail || `Server error (${response.status})`;
        throw new Error(message);
      }
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || 'Contest deleted successfully',
    };

  } catch (error) {
    console.error('Error deleting contest:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete contest',
    };
  }
};
