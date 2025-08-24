import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSponsor, getCurrentUser } from '../utils/auth';
import { formatDateInAdminTimezone, parseBackendUtcDate, ensureTimezoneSafe } from '../utils/timezone';
import CountdownTimer from '../components/CountdownTimer';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';

interface Contest {
  id: number;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  prize_description: string;
  image_url?: string;
  sponsor_url?: string;
  status: string;
  entry_count: number;
  created_at: string;
  updated_at: string;
}

const SponsorContests: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'ended' | 'complete'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'start_time' | 'end_time' | 'entry_count'>('end_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Delete contest state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contestToDelete, setContestToDelete] = useState<Contest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  }>({ type: 'info', message: '', isVisible: false });
  
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Check authentication on mount
  useEffect(() => {
    if (!isSponsor()) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  // Fetch contests function
  const fetchContests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        throw new Error('No access token found. Please log in again.');
      }
      
      console.log('Fetching sponsor contests with token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await fetch(`${apiBaseUrl}/sponsor/contests`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error(`Backend server error (500). Please check backend logs.`);
        }
        if (response.status === 403) {
          throw new Error(`Access denied (403). Please check authentication. You may need to log in again.`);
        }
        throw new Error(`Failed to fetch contests: ${response.status}`);
      }
      
      const contestsData = await response.json();
      console.log('Sponsor contests API Response:', contestsData);
      
      if (Array.isArray(contestsData)) {
        setContests(contestsData);
      } else {
        console.warn('Expected array but got:', contestsData);
        setContests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  };

  // Memoized callback for timer expiration
  const handleTimerExpire = useCallback((contestId: number) => {
    console.log(`Contest ${contestId} timer expired, refreshing data...`);
    fetchContests();
  }, []);

  // Fetch contests on mount
  useEffect(() => {
    if (isSponsor()) {
      fetchContests();
    }
  }, [apiBaseUrl]);

  // Deletion protection detection
  const getDeletionProtectionInfo = (contest: Contest) => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);
    
    const protections = [];
    
    if (contest.entry_count > 0) {
      protections.push(`Has ${contest.entry_count} active entry${contest.entry_count === 1 ? '' : 's'}`);
    }
    
    if (now >= startTime && now <= endTime) {
      protections.push('Currently accepting entries');
    }
    
    if (now < startTime) {
      protections.push('Scheduled to start soon');
    }
    
    if (contest.status === 'complete') {
      protections.push('Winner already selected');
    }
    
    return {
      canDelete: protections.length === 0,
      protections,
      reason: protections.length > 0 
        ? `Cannot delete: ${protections.join(', ')}`
        : 'Safe to delete'
    };
  };

  // Delete contest handlers
  const handleDeleteClick = (contest: Contest) => {
    const protectionInfo = getDeletionProtectionInfo(contest);
    if (protectionInfo.canDelete) {
      setContestToDelete(contest);
      setDeleteModalOpen(true);
    } else {
      setToast({
        type: 'warning',
        message: protectionInfo.reason,
        isVisible: true
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!contestToDelete) return;
    
    setDeleteLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${apiBaseUrl}/sponsor/contests/${contestToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setToast({
          type: 'success',
          message: 'Contest deleted successfully',
          isVisible: true
        });
        fetchContests(); // Refresh the list
      } else {
        throw new Error(`Failed to delete contest: ${response.status}`);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete contest',
        isVisible: true
      });
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
      setContestToDelete(null);
    }
  };

  // Filter and sort contests
  const filteredAndSortedContests = contests
    .filter(contest => {
      const matchesSearch = contest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contest.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const now = new Date();
        const startTime = new Date(contest.start_time);
        const endTime = new Date(contest.end_time);
        
        switch (statusFilter) {
          case 'upcoming':
            matchesStatus = now < startTime;
            break;
          case 'active':
            matchesStatus = now >= startTime && now <= endTime;
            break;
          case 'ended':
            matchesStatus = now > endTime && contest.status !== 'complete';
            break;
          case 'complete':
            matchesStatus = contest.status === 'complete';
            break;
        }
      }
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'start_time':
          aValue = new Date(a.start_time).getTime();
          bValue = new Date(b.start_time).getTime();
          break;
        case 'end_time':
          aValue = new Date(a.end_time).getTime();
          bValue = new Date(b.end_time).getTime();
          break;
        case 'entry_count':
          aValue = a.entry_count;
          bValue = b.entry_count;
          break;
        default:
          aValue = new Date(a.end_time).getTime();
          bValue = new Date(b.end_time).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Show toast
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setToast({ type, message, isVisible: true });
  };

  // Hide toast
  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  if (!isSponsor()) {
    return <div>Access denied. Sponsor role required.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Contests</h1>
              <p className="mt-2 text-gray-600">Manage and monitor your contests</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchContests}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link
                to="/sponsor/contests/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create New Contest
              </Link>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search contests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="complete">Complete</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="start_time">Start Time</option>
                <option value="end_time">End Time</option>
                <option value="entry_count">Entry Count</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Contests Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading contests...</p>
          </div>
        ) : filteredAndSortedContests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contests found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first contest'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                to="/sponsor/contests/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Your First Contest
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAndSortedContests.map((contest) => {
              const protectionInfo = getDeletionProtectionInfo(contest);
              const now = new Date();
              const startTime = new Date(contest.start_time);
              const endTime = new Date(contest.end_time);
              const isActive = now >= startTime && now <= endTime;
              const isUpcoming = now < startTime;
              const isEnded = now > endTime;
              
              return (
                <div key={contest.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Contest Image */}
                  {contest.image_url && (
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                      <img
                        src={contest.image_url}
                        alt={contest.name}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Contest Content */}
                  <div className="p-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isActive ? 'bg-green-100 text-green-800' :
                        isUpcoming ? 'bg-blue-100 text-blue-800' :
                        isEnded ? 'bg-gray-100 text-gray-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {isActive ? 'Active' :
                         isUpcoming ? 'Upcoming' :
                         isEnded ? 'Ended' :
                         contest.status === 'complete' ? 'Complete' : 'Unknown'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {contest.entry_count} entry{contest.entry_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Contest Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{contest.name}</h3>
                    
                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {contest.description}
                    </p>
                    
                    {/* Prize */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Prize:</p>
                      <p className="text-sm text-gray-900 font-medium">{contest.prize_description}</p>
                    </div>
                    
                    {/* Location */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Location:</p>
                      <p className="text-sm text-gray-900">{contest.location}</p>
                    </div>
                    
                    {/* Countdown Timer */}
                    {isActive && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Time Remaining:</p>
                        <CountdownTimer
                          targetDate={contest.end_time}
                          onExpire={() => handleTimerExpire(contest.id)}
                        />
                      </div>
                    )}
                    
                    {/* Dates */}
                    <div className="mb-4 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Starts: {formatDateInAdminTimezone(contest.start_time)}</span>
                        <span>Ends: {formatDateInAdminTimezone(contest.end_time)}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Link
                        to={`/sponsor/contests/${contest.id}/edit`}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 text-center"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(contest)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          protectionInfo.canDelete
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!protectionInfo.canDelete}
                        title={protectionInfo.reason}
                      >
                        {protectionInfo.canDelete ? 'Delete' : 'Protected'}
                      </button>
                    </div>
                    
                    {/* Protection Info */}
                    {!protectionInfo.canDelete && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-xs text-yellow-800">
                          <strong>Protected:</strong> {protectionInfo.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Contest"
        message={`Are you sure you want to delete "${contestToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteLoading}
        isDangerous
      />

      {/* Toast */}
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default SponsorContests;
