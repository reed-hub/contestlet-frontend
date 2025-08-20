import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken } from '../utils/auth';
import { formatPhoneNumber } from '../utils/phoneValidation';
import Toast from '../components/Toast';

interface ContestEntry {
  id: number;
  user_id: number;
  phone_number: string;
  entry_time?: string;
  created_at?: string;
  status?: string;
  contest_id?: number;
}

interface Contest {
  id: number;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  prize_description: string;
  active: boolean;
  created_at: string;
  entry_count: number;
}

interface WinnerResult {
  success: boolean;
  message: string;
  winner_entry_id?: number;
  winner_user_phone?: string;
  total_entries?: number;
}

interface NotificationResult {
  success: boolean;
  message: string;
  entry_id?: number;
  contest_id?: number;
  winner_phone?: string;
  sms_status?: string;
  notification_sent_at?: string;
}

const ContestEntries: React.FC = () => {
  const { contest_id } = useParams<{ contest_id: string }>();
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winnerEntry, setWinnerEntry] = useState<ContestEntry | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('🎉 Congratulations! You\'re the winner of our amazing contest! We\'ll contact you soon with details about claiming your prize.');
  const [isSelectingWinner, setIsSelectingWinner] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({
    type: 'info',
    message: '',
    isVisible: false,
  });
  const navigate = useNavigate();

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Check authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Fetch contest details and entries
  useEffect(() => {
    const fetchData = async () => {
      if (!contest_id) {
        setError('Contest ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const adminToken = getAdminToken();
        
        // First get all contests to find our specific contest (since individual contest GET doesn't exist)
        const contestsResponse = await fetch(`${apiBaseUrl}/admin/contests`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!contestsResponse.ok) {
          throw new Error(`Failed to fetch contests: ${contestsResponse.status}`);
        }
        
        const allContests = await contestsResponse.json();
        const foundContest = allContests.find((c: any) => c.id.toString() === contest_id);
        
        if (!foundContest) {
          throw new Error('Contest not found');
        }
        
        setContest(foundContest);
        
        // Now fetch entries using the documented admin endpoint
        const entriesResponse = await fetch(`${apiBaseUrl}/admin/contests/${contest_id}/entries`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!entriesResponse.ok) {
          if (entriesResponse.status === 404) {
            // Contest exists but no entries
            setEntries([]);
          } else {
            throw new Error(`Failed to fetch entries: ${entriesResponse.status}`);
          }
        } else {
          const entriesData: ContestEntry[] = await entriesResponse.json();
          console.log('Contest entries loaded:', entriesData);
          setEntries(entriesData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (isAdminAuthenticated() && contest_id) {
      fetchData();
    }
  }, [apiBaseUrl, contest_id]);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };



  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'invalid':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'winner':
      case 'selected':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Winner selection function
  const handleSelectWinner = async () => {
    if (!contest_id) return;

    setIsSelectingWinner(true);
    setError(null);

    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const response = await fetch(`${apiBaseUrl}/admin/contests/${contest_id}/select-winner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result: WinnerResult = await response.json();

      if (response.ok && result.success) {
        setToast({
          type: 'success',
          message: `Winner selected successfully! Entry ID: ${result.winner_entry_id}`,
          isVisible: true,
        });

        // Find the winner entry and update its status
        if (result.winner_entry_id) {
          const winner = entries.find(e => e.id === result.winner_entry_id);
          if (winner) {
            setWinnerEntry(winner);
            // Update the entry status in the list
            setEntries(prev => prev.map(entry => 
              entry.id === result.winner_entry_id 
                ? { ...entry, status: 'winner' }
                : entry
            ));
          }
        }
      } else {
        throw new Error(result.message || 'Failed to select winner');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select winner';
      setError(errorMessage);
      setToast({
        type: 'error',
        message: errorMessage,
        isVisible: true,
      });
    } finally {
      setIsSelectingWinner(false);
    }
  };

  // SMS notification function
  const handleSendNotification = async () => {
    if (!contest_id || !winnerEntry) return;

    setIsSendingSMS(true);

    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const response = await fetch(`${apiBaseUrl}/admin/contests/${contest_id}/notify-winner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry_id: winnerEntry.id,
          message: smsMessage.trim(),
        }),
      });

      const result: NotificationResult = await response.json();

      if (response.ok && result.success) {
        setToast({
          type: 'success',
          message: `SMS notification sent successfully to ${result.winner_phone}!`,
          isVisible: true,
        });

        setShowNotificationModal(false);
        setSmsMessage('🎉 Congratulations! You\'re the winner of our amazing contest! We\'ll contact you soon with details about claiming your prize.');
      } else {
        throw new Error(result.message || 'Failed to send SMS notification');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send SMS notification';
      setToast({
        type: 'error',
        message: errorMessage,
        isVisible: true,
      });
    } finally {
      setIsSendingSMS(false);
    }
  };

  // Check if there's already a winner
  const hasWinner = entries.some(e => e.status && ['winner', 'selected'].includes(e.status.toLowerCase()));
  const currentWinner = entries.find(e => e.status && ['winner', 'selected'].includes(e.status.toLowerCase()));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contest Entries</h1>
            {contest && (
              <div className="mt-1">
                <p className="text-lg text-gray-700">{contest.name}</p>
                <p className="text-sm text-gray-500">Contest ID: {contest.id}</p>
              </div>
            )}
          </div>
          <div className="flex space-x-4">
            <Link
              to="/admin/contests"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Back to Contests
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Entries</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Winner Management Section */}
      {contest && entries.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Winner Management</h2>
            {hasWinner && currentWinner && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  🏆 Winner Selected
                </span>
                <span className="text-sm text-gray-600">
                  Entry #{currentWinner.id} - {formatPhoneNumber(currentWinner.phone_number)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Winner Selection */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Select Random Winner</h3>
              <p className="text-sm text-gray-600 mb-4">
                Randomly select a winner from all contest entries
              </p>
              <button
                onClick={handleSelectWinner}
                disabled={isSelectingWinner || hasWinner}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSelectingWinner ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Selecting Winner...
                  </div>
                ) : hasWinner ? (
                  '🏆 Winner Already Selected'
                ) : (
                  '🎲 Select Random Winner'
                )}
              </button>
            </div>

            {/* SMS Notification */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">SMS Notification</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send congratulatory SMS to the selected winner
              </p>
              <button
                onClick={() => {
                  if (currentWinner) {
                    setWinnerEntry(currentWinner);
                    setShowNotificationModal(true);
                  }
                }}
                disabled={!hasWinner || !currentWinner}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasWinner ? '📱 Send SMS to Winner' : '📱 Select Winner First'}
              </button>
            </div>
          </div>

          {/* Winner Details */}
          {hasWinner && currentWinner && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="text-sm font-medium text-purple-900 mb-2">🏆 Contest Winner</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-purple-700">Entry ID:</span>
                  <span className="ml-1 text-purple-900">#{currentWinner.id}</span>
                </div>
                <div>
                  <span className="font-medium text-purple-700">Phone:</span>
                  <span className="ml-1 text-purple-900">{formatPhoneNumber(currentWinner.phone_number)}</span>
                </div>
                <div>
                  <span className="font-medium text-purple-700">Entry Date:</span>
                  <span className="ml-1 text-purple-900">
                    {formatDateTime(currentWinner.entry_time || currentWinner.created_at || '')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entries List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Entries ({entries.length})
            </h2>
            {contest && (
              <Link
                to={`/enter/${contest.id}`}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                View Contest Page
              </Link>
            )}
          </div>
        </div>
        
        {entries.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No entries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This contest doesn't have any entries yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPhoneNumber(entry.phone_number)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {entry.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(entry.entry_time || entry.created_at || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status || 'active')}`}>
                        {entry.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          // TODO: Implement entry details view
                          alert(`View details for entry ${entry.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {entries.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
            <div className="text-sm text-gray-600">Total Entries</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {entries.filter(e => e.status && ['approved', 'confirmed'].includes(e.status.toLowerCase())).length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">
              {entries.filter(e => e.status && ['pending', 'submitted'].includes(e.status.toLowerCase())).length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">
              {entries.filter(e => e.status && ['rejected', 'invalid'].includes(e.status.toLowerCase())).length}
            </div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">
              {entries.filter(e => e.status && ['winner', 'selected'].includes(e.status.toLowerCase())).length}
            </div>
            <div className="text-sm text-gray-600">Winners</div>
          </div>
        </div>
      )}

      {/* SMS Notification Modal */}
      {showNotificationModal && winnerEntry && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  📱 Send SMS to Winner
                </h3>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium text-purple-700">Winner:</span>
                  <span className="ml-1 text-purple-900">
                    Entry #{winnerEntry.id} - {formatPhoneNumber(winnerEntry.phone_number)}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="sms-message" className="block text-sm font-medium text-gray-700 mb-2">
                  SMS Message
                </label>
                <textarea
                  id="sms-message"
                  rows={4}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your congratulatory message..."
                  maxLength={160}
                />
                <div className="mt-1 text-xs text-gray-500">
                  {smsMessage.length}/160 characters
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-blue-800">
                      SMS will be sent via Twilio Verify API
                      {process.env.NODE_ENV === 'development' && (
                        <>
                          <br />
                          <strong>Development:</strong> SMS will be logged to server console
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  disabled={isSendingSMS}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={isSendingSMS || !smsMessage.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingSMS ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    '📱 Send SMS'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast 
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default ContestEntries;
