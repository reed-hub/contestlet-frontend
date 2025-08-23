import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken } from '../utils/auth';
import { formatPhoneNumber } from '../utils/phoneValidation';
import { parseBackendUtcDate, formatDateInAdminTimezone } from '../utils/timezone';
import Toast from '../components/Toast';

interface ContestEntry {
  id: number;
  user_id: number;
  phone_number: string;
  entry_time?: string;
  created_at?: string;
  status?: string;  // "active", "winner", "disqualified"
  selected?: boolean;
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
  image_url?: string; // Contest hero image URL
  sponsor_url?: string; // Sponsor website URL
  active: boolean; // Keep for backward compatibility
  status?: 'upcoming' | 'active' | 'ended' | 'complete'; // New server-provided status
  created_at: string;
  entry_count: number;
  winner_entry_id?: number | null;
  winner_phone?: string | null;
  winner_selected_at?: string | null;
  official_rules?: {
    eligibility_text: string;
    sponsor_name: string;
    start_date: string;
    end_date: string;
    prize_value_usd: number;
    terms_url: string;
  };
}

interface WinnerResult {
  success: boolean;
  message: string;
  detail?: string; // For error responses
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

interface NotificationLog {
  id: number;
  contest_id: number;
  contest_name: string;
  user_id: number;
  entry_id: number;
  message: string;
  notification_type: 'winner' | 'reminder' | 'general';
  status: 'sent' | 'failed' | 'pending';
  twilio_sid?: string;
  error_message?: string;
  test_mode: boolean;
  sent_at: string;
  admin_user_id: string;
  user_phone: string;
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
  const [winnerNotificationLogs, setWinnerNotificationLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
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

  // Fetch notification logs for the winner
  const fetchWinnerNotificationLogs = async (entryId: number) => {
    try {
      setLoadingLogs(true);
      const adminToken = getAdminToken();
      
      if (!adminToken) {
        console.error('No admin token available');
        return;
      }

      // Fetch logs for this contest and filter by entry_id on the frontend
      const response = await fetch(`${apiBaseUrl}/admin/notifications?contest_id=${contest_id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notification logs: ${response.status}`);
      }

      const allLogs = await response.json();
      // Filter logs for the specific winner entry
      const winnerLogs = Array.isArray(allLogs) ? allLogs.filter((log: NotificationLog) => log.entry_id === entryId) : [];
      
      console.log('Winner notification logs:', winnerLogs);
      setWinnerNotificationLogs(winnerLogs);
    } catch (err) {
      console.error('Error fetching winner notification logs:', err);
      // Don't show error toast for logs, it's supplementary info
    } finally {
      setLoadingLogs(false);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Fetch notification logs when winner is available
  useEffect(() => {
    if (contest?.winner_entry_id) {
      fetchWinnerNotificationLogs(contest.winner_entry_id);
    } else {
      // Clear logs if no winner
      setWinnerNotificationLogs([]);
    }
  }, [contest?.winner_entry_id, contest_id]);

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
        
        console.log('Found contest details:', foundContest);
        console.log('Contest winner info:', {
          winner_entry_id: foundContest.winner_entry_id,
          winner_phone: foundContest.winner_phone,
          winner_selected_at: foundContest.winner_selected_at,
          contest_status: foundContest.status,
          contest_active: foundContest.active
        });
        
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
          console.log('Entry statuses:', entriesData.map(e => ({ id: e.id, status: e.status, phone: e.phone_number })));
          
          // Check for winner-like entries
          const potentialWinners = entriesData.filter(e => 
            e.status && (
              e.status.toLowerCase().includes('winner') || 
              e.status.toLowerCase().includes('selected') ||
              e.status.toLowerCase() === 'win' ||
              e.status.toLowerCase() === 'won'
            )
          );
          console.log('Potential winners found:', potentialWinners);
          
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
    if (!contest_id) {
      setToast({
        type: 'error',
        message: 'No contest ID found',
        isVisible: true,
      });
      return;
    }

    if (!entries || entries.length === 0) {
      setToast({
        type: 'error',
        message: 'No entries found for this contest',
        isVisible: true,
      });
      return;
    }

    setIsSelectingWinner(true);
    setError(null);

    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      // Debug logging
      console.log('Selecting winner for contest:', contest_id);
      console.log('Contest details:', contest);
      console.log('Current time (local):', new Date().toISOString());
      console.log('Contest end time:', contest?.end_time);
      console.log('Contest start time:', contest?.start_time);

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
                ? { ...entry, status: 'winner', selected: true }
                : entry
            ));
            
            // Update the contest state with winner information
            setContest(prevContest => prevContest ? {
              ...prevContest,
              winner_entry_id: result.winner_entry_id,
              winner_phone: result.winner_user_phone,
              winner_selected_at: new Date().toISOString()
            } : null);
          }
        }
      } else {
        const errorMsg = result.message || result.detail || `Failed to select winner (${response.status})`;
        console.error('Winner selection failed:', {
          status: response.status,
          statusText: response.statusText,
          result,
          errorMsg
        });
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Winner selection error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to select winner';
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('winner already selected')) {
        // If backend says winner exists but we don't see it, refresh the data
        console.log('Backend reports winner exists, refreshing entries data...');
        // Trigger a data refresh
        window.location.reload(); // Simple refresh for now
        return;
      } else if (errorMessage.toLowerCase().includes('offset-naive') || errorMessage.toLowerCase().includes('offset-aware')) {
        // Handle timezone comparison errors
        errorMessage = 'Timezone error: Contest times may have inconsistent timezone information. Please check contest start/end times.';
        console.error('Timezone comparison error detected:', errorMessage);
      } else if (errorMessage.includes('400')) {
        errorMessage = 'Bad Request: Please check if the contest has entries and you have admin permissions';
      } else if (errorMessage.includes('401')) {
        errorMessage = 'Authentication failed. Please log in again as admin.';
      } else if (errorMessage.includes('403')) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (errorMessage.includes('404')) {
        errorMessage = 'Contest not found or endpoint not available.';
      }
      
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
        
        // Refresh notification logs to show the newly sent SMS
        if (contest?.winner_entry_id) {
          fetchWinnerNotificationLogs(contest.winner_entry_id);
        }
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

  // Check if there's already a winner (using contest winner info + entry status)
  const hasWinner = !!(contest?.winner_entry_id);
  const currentWinner = hasWinner 
    ? entries.find(e => e.id === contest?.winner_entry_id)
    : entries.find(e => e.status === 'winner' || e.selected === true);
  
  // Use server-provided status or compute fallback
  const contestStatus = contest?.status || 'upcoming';
  const canSelectWinner = contestStatus === 'ended' && !hasWinner;
  
  // Sort entries to show winner first
  const sortedEntries = [...entries].sort((a, b) => {
    const aIsWinner = a.id === contest?.winner_entry_id || 
                     a.status === 'winner' || 
                     a.selected === true;
    const bIsWinner = b.id === contest?.winner_entry_id || 
                     b.status === 'winner' || 
                     b.selected === true;
    if (aIsWinner && !bIsWinner) return -1;
    if (!aIsWinner && bIsWinner) return 1;
    return 0;
  });

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

      {/* Campaign Details Section */}
      {contest && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  contestStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  contestStatus === 'active' ? 'bg-green-100 text-green-800' :
                  contestStatus === 'ended' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {contestStatus === 'upcoming' ? '📅 Upcoming' :
                   contestStatus === 'active' ? '⚡ Active' :
                   contestStatus === 'ended' ? '🏁 Ended' :
                   '🏆 Complete'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Contest Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Name:</span>
                      <p className="text-sm text-gray-900 mt-1">{contest.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Description:</span>
                      <p className="text-sm text-gray-900 mt-1">{contest.description}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Location:</span>
                      <p className="text-sm text-gray-900 mt-1">{contest.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Prize:</span>
                      <p className="text-sm text-gray-900 mt-1">{contest.prize_description}</p>
                    </div>
                  </div>
                </div>

                {/* Official Rules */}
                {contest.official_rules && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Official Rules</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Eligibility:</span>
                        <p className="text-sm text-gray-900 mt-1">{contest.official_rules.eligibility_text}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Sponsor:</span>
                        <p className="text-sm text-gray-900 mt-1">{contest.official_rules.sponsor_name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Prize Value:</span>
                        <p className="text-sm text-gray-900 mt-1">${contest.official_rules.prize_value_usd}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Schedule & Status</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Start Time:</span>
                      <p className="text-sm text-gray-900 mt-1">{formatDateInAdminTimezone(contest.start_time)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">End Time:</span>
                      <p className="text-sm text-gray-900 mt-1">{formatDateInAdminTimezone(contest.end_time)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Created:</span>
                      <p className="text-sm text-gray-900 mt-1">{formatDateTime(contest.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Total Entries:</span>
                      <p className="text-sm text-gray-900 mt-1 font-semibold">{contest.entry_count}</p>
                    </div>
                  </div>
                </div>

                {/* Winner Information */}
                {hasWinner && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Winner Information</h3>
                    <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Winner Entry ID:</span>
                        <p className="text-sm text-gray-900 mt-1 font-semibold">#{contest.winner_entry_id}</p>
                      </div>
                      {contest.winner_phone && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Winner Phone:</span>
                          <p className="text-sm text-gray-900 mt-1">{formatPhoneNumber(contest.winner_phone)}</p>
                        </div>
                      )}
                      {contest.winner_selected_at && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Selected At:</span>
                          <p className="text-sm text-gray-900 mt-1">{formatDateTime(contest.winner_selected_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contest Actions */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Actions</h3>
                  <div className="space-y-2">
                    <Link
                      to={`/admin/contests/${contest.id}/edit`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      ✏️ Edit Contest
                    </Link>
                    <Link
                      to="/admin/contests"
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      📋 View All Contests
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {(contestStatus === 'upcoming' || contestStatus === 'active')
                  ? 'Contest must end before selecting winner' 
                  : hasWinner 
                    ? 'Winner has already been selected for this contest'
                    : 'Randomly select a winner from all contest entries'
                }
              </p>
              
              {/* Contest Status Indicators */}
              {(contestStatus === 'upcoming' || contestStatus === 'active') && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⏰ Contest Status: <strong>{contestStatus === 'upcoming' ? 'Upcoming' : 'Active'}</strong> - Winner selection available after contest ends
                </div>
              )}
              
              {contestStatus === 'ended' && !hasWinner && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  ✅ Contest Status: <strong>Ended</strong> - Ready for winner selection
                </div>
              )}
              
              {hasWinner && (
                <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-800">
                  🏆 Winner Status: <strong>Already Selected</strong> - Entry #{currentWinner?.id}
                  {contest?.winner_selected_at && (
                    <div className="mt-1">
                      <strong>Selected:</strong> {formatDateTime(contest.winner_selected_at)}
                    </div>
                  )}
                  {contest?.winner_phone && (
                    <div>
                      <strong>Winner Phone:</strong> {formatPhoneNumber(contest.winner_phone)}
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={handleSelectWinner}
                disabled={isSelectingWinner || !canSelectWinner}
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
                ) : (contestStatus === 'upcoming' || contestStatus === 'active') ? (
                  '⏰ Contest Must End First'
                ) : contestStatus === 'ended' ? (
                  '🎲 Select Random Winner'
                ) : (
                  '❓ Unknown Contest State'
                )}
              </button>
            </div>

            {/* SMS Notification */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">SMS Notification</h3>
              <p className="text-sm text-gray-600 mb-4">
                {hasWinner 
                  ? `Send congratulatory SMS to Entry #${currentWinner?.id}`
                  : 'Select a winner first to enable SMS notifications'
                }
              </p>
              
              {hasWinner && currentWinner && (
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                  📱 Ready to notify: {formatPhoneNumber(currentWinner.phone_number)}
                </div>
              )}
              
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
                {hasWinner && currentWinner ? '📱 Send SMS to Winner' : '📱 Select Winner First'}
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

          {/* SMS Notification History */}
          {hasWinner && currentWinner && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-blue-900">📧 SMS Notification History</h4>
                {loadingLogs && (
                  <div className="flex items-center text-xs text-blue-600">
                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </div>
                )}
              </div>
              
              {winnerNotificationLogs.length === 0 ? (
                <div className="text-xs text-blue-600 text-center py-2">
                  {loadingLogs ? 'Loading notification history...' : 'No SMS notifications sent to this winner yet.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {winnerNotificationLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded-lg border text-xs ${
                        log.status === 'sent' 
                          ? 'bg-green-50 border-green-200 text-green-800' 
                          : log.status === 'failed'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${
                              log.status === 'sent' 
                                ? 'bg-green-100 text-green-800' 
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.status === 'sent' && '✅'}
                              {log.status === 'failed' && '❌'}
                              {log.status === 'pending' && '⏳'}
                              {' '}
                              {log.status.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              log.notification_type === 'winner' 
                                ? 'bg-purple-100 text-purple-800'
                                : log.notification_type === 'reminder'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {log.notification_type}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              log.test_mode 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {log.test_mode ? '🧪 Test' : '📱 Real'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 mb-1">
                            <strong>Message:</strong> {log.message}
                          </div>
                          <div className="text-xs text-gray-600">
                            <strong>Sent:</strong> {new Date(log.sent_at).toLocaleString()}
                            {log.twilio_sid && (
                              <span className="ml-2">
                                <strong>Twilio ID:</strong> {log.twilio_sid.substring(0, 12)}...
                              </span>
                            )}
                          </div>
                          {log.error_message && (
                            <div className="text-xs text-red-600 mt-1">
                              <strong>Error:</strong> {log.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-3 pt-2 border-t border-blue-200">
                <div className="flex items-center justify-between text-xs text-blue-600">
                  <span>Entry #{currentWinner.id} • {formatPhoneNumber(currentWinner.phone_number)}</span>
                  <button
                    onClick={() => {
                      if (contest?.winner_entry_id) {
                        fetchWinnerNotificationLogs(contest.winner_entry_id);
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Refresh Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <details>
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">🔧 Debug Info</summary>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <div><strong>Contest ID:</strong> {contest_id}</div>
                  <div><strong>Contest Name:</strong> {contest?.name}</div>
                  <div><strong>Contest Status:</strong> {contestStatus ? `🎯 ${contestStatus}` : '❓ Unknown'}</div>
                  <div><strong>Contest Backend Status:</strong> {contest?.status || 'N/A'}</div>
                  <div><strong>Contest Active Flag:</strong> {contest?.active ? '✅ True' : '❌ False'}</div>
                  <div><strong>Contest End Time:</strong> {contest?.end_time || 'N/A'}</div>
                  <div><strong>Current Time:</strong> {new Date().toISOString()}</div>
                  <div><strong>Server Status:</strong> {contest?.status || 'Not provided'}</div>
                  <div><strong>Entries Count:</strong> {entries.length}</div>
                  <div><strong>Has Winner:</strong> {hasWinner ? `✅ Yes (Entry #${currentWinner?.id})` : '❌ No'}</div>
                  <div><strong>Can Select Winner:</strong> {canSelectWinner ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Winner Entry Status:</strong> {currentWinner?.status || 'N/A'}</div>
              <div><strong>Winner Selected:</strong> {currentWinner?.selected ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Contest Winner ID:</strong> {contest?.winner_entry_id || 'N/A'}</div>
              <div><strong>Winner Selected At:</strong> {contest?.winner_selected_at || 'N/A'}</div>
              <div><strong>Winner Phone (Masked):</strong> {contest?.winner_phone || 'N/A'}</div>
                  <div><strong>Admin Token:</strong> {getAdminToken() ? '✅ Present' : '❌ Missing'}</div>
                  <div><strong>API Base URL:</strong> {apiBaseUrl}</div>
                  <div><strong>Endpoint:</strong> {`${apiBaseUrl}/admin/contests/${contest_id}/select-winner`}</div>
                </div>
              </details>
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
                {sortedEntries.map((entry) => {
                  const isWinner = entry.id === contest?.winner_entry_id || 
                                 entry.status === 'winner' || 
                                 entry.selected === true;
                  return (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${isWinner ? 'bg-purple-50 border-l-4 border-purple-400' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          {isWinner && <span className="mr-2">🏆</span>}
                          {formatPhoneNumber(entry.phone_number)}
                          {isWinner && <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-semibold">WINNER</span>}
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
                          {isWinner ? '🏆 Winner' : (entry.status || 'Active')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isWinner ? (
                          <span className="text-purple-600 font-medium">🎉 Contest Winner</span>
                        ) : (
                          <button
                            onClick={() => {
                              // TODO: Implement entry details view
                              alert(`View details for entry ${entry.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
