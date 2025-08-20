import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, isAdminAuthenticated, getAdminToken } from '../utils/auth';
import { deleteContest } from '../utils/adminApi';
import { formatDateInAdminTimezone, parseBackendUtcDate } from '../utils/timezone';
import CountdownTimer from '../components/CountdownTimer';
import ConfirmationModal from '../components/ConfirmationModal';

interface Contest {
  id: number;
  name: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  start_time: string;
  end_time: string;
  prize_description: string;
  active: boolean;
  created_at: string;
  entry_count: number;
  official_rules?: {
    eligibility_text: string;
    sponsor_name: string;
    start_date: string;
    end_date: string;
    prize_value_usd: number;
    terms_url: string;
  };
}

const AdminContests: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active' | 'inactive' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'start_time' | 'end_time' | 'entry_count'>('end_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Delete contest state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contestToDelete, setContestToDelete] = useState<Contest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const navigate = useNavigate();

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Check authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Fetch contests function
  const fetchContests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const adminToken = getAdminToken();
      
      console.log('Fetching admin contests with token:', adminToken ? `${adminToken.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await fetch(`${apiBaseUrl}/admin/contests`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error(`Backend server error (500). The admin contests endpoint may need database migration for timezone support. Please check backend logs.`);
        }
        if (response.status === 403) {
          throw new Error(`Access denied (403). Please check admin authentication token. You may need to log in again.`);
        }
        throw new Error(`Failed to fetch contests: ${response.status}`);
      }
      
      const contestsData = await response.json();
      console.log('Admin contests API Response:', contestsData); // Debug logging
      
      // Admin endpoint returns direct array of contests
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

  // Fetch contests on mount and when authentication changes
  useEffect(() => {
    if (isAdminAuthenticated()) {
      fetchContests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  // Auto-refresh when returning to the page (e.g., after creating a contest)
  useEffect(() => {
    const handleFocus = () => {
      if (isAdminAuthenticated() && !loading) {
        console.log('Page focused, refreshing contests...');
        fetchContests();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  // Delete contest handlers
  const handleDeleteClick = (contest: Contest) => {
    setContestToDelete(contest);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contestToDelete) return;

    setDeleteLoading(true);
    try {
      const result = await deleteContest(contestToDelete.id);
      
      if (result.success) {
        // Remove the deleted contest from the local state
        setContests(prev => prev.filter(c => c.id !== contestToDelete.id));
        setDeleteModalOpen(false);
        setContestToDelete(null);
        
        // You could also show a success toast here if you want
        console.log('Contest deleted successfully:', result.message);
      } else {
        // Handle error - could show an error toast
        console.error('Failed to delete contest:', result.message);
        alert(`Failed to delete contest: ${result.message}`);
      }
    } catch (error) {
      console.error('Error during delete:', error);
      alert('An unexpected error occurred while deleting the contest.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setContestToDelete(null);
  };

  const getStatusColor = (contest: Contest) => {
    if (!contest.active) {
      return 'bg-red-100 text-red-800';
    }
    
    const now = new Date();
    const startTime = parseBackendUtcDate(contest.start_time);
    const endTime = parseBackendUtcDate(contest.end_time);
    
    if (now < startTime) {
      return 'bg-yellow-100 text-yellow-800'; // Scheduled
    } else if (now > endTime) {
      return 'bg-red-100 text-red-800'; // Ended
    } else {
      return 'bg-green-100 text-green-800'; // Active
    }
  };

  const getStatusText = (contest: Contest) => {
    if (!contest.active) {
      return 'Inactive';
    }
    
    const now = new Date();
    const startTime = parseBackendUtcDate(contest.start_time);
    const endTime = parseBackendUtcDate(contest.end_time);
    
    if (now < startTime) {
      return 'Scheduled';
    } else if (now > endTime) {
      return 'Ended';
    } else {
      return 'Active';
    }
  };

  // Filter and sort contests
  const filteredAndSortedContests = React.useMemo(() => {
    let filtered = contests.filter(contest => {
      // Search filter
      const matchesSearch = contest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contest.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contest.id.toString().includes(searchTerm);
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const now = new Date();
        const startTime = parseBackendUtcDate(contest.start_time);
        const endTime = parseBackendUtcDate(contest.end_time);
        
        switch (statusFilter) {
          case 'scheduled':
            matchesStatus = contest.active && now < startTime;
            break;
          case 'active':
            matchesStatus = contest.active && now >= startTime && now <= endTime;
            break;
          case 'inactive':
            matchesStatus = !contest.active;
            break;
          case 'ended':
            matchesStatus = now > endTime;
            break;
        }
      }
      
      return matchesSearch && matchesStatus;
    });

    // Sort contests
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'start_time':
          comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          break;
        case 'end_time':
          comparison = new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
          break;
        case 'entry_count':
          comparison = (a.entry_count || 0) - (b.entry_count || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [contests, searchTerm, statusFilter, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contest Management</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage all contests and view entries</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <button
              onClick={fetchContests}
              disabled={loading}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '🔄' : '🔄'} Refresh
            </button>
            <Link
              to="/admin/contests/new"
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
            >
              + Create New Contest
            </Link>
            <Link
              to="/admin/notifications"
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              📧 SMS Logs
            </Link>
            <Link
              to="/admin/profile"
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              ⚙️ Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
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
              <h3 className="text-sm font-medium text-red-800">Error Loading Contests</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Sort Controls */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        {/* Mobile Layout - Stacked */}
        <div className="block lg:hidden space-y-4">
          {/* Search Bar */}
          <div>
            <label htmlFor="search-mobile" className="block text-sm font-medium text-gray-700 mb-2">
              Search Contests
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search-mobile"
                type="text"
                placeholder="Search contests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Filter and Sort Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status-filter-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status-filter-mobile"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="ended">Ended</option>
              </select>
            </div>

            <div>
              <label htmlFor="sort-by-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                Sort
              </label>
              <div className="flex gap-1">
                <select
                  id="sort-by-mobile"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="name">Name</option>
                  <option value="start_time">Start</option>
                  <option value="end_time">End</option>
                  <option value="entry_count">Entries</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop/Tablet Layout - Grid */}
        <div className="hidden lg:grid lg:gap-4 lg:items-end" style={{ gridTemplateColumns: '1fr 140px 160px' }}>
          {/* Search Bar */}
          <div>
            <label htmlFor="search-desktop" className="block text-sm font-medium text-gray-700 mb-2">
              Search Contests
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search-desktop"
                type="text"
                placeholder="Search by name, description, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter-desktop" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              id="status-filter-desktop"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Contests</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div>
            <label htmlFor="sort-by-desktop" className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <div className="flex gap-2">
              <select
                id="sort-by-desktop"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="name">Name</option>
                <option value="start_time">Start Date</option>
                <option value="end_time">End Date</option>
                <option value="entry_count">Entries</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contests Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
          <h2 className="text-base sm:text-lg font-medium text-gray-900">
            {statusFilter === 'all' ? 'All Contests' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Contests`}
          </h2>
          <div className="text-xs sm:text-sm text-gray-500">
            <span className="block sm:inline">{filteredAndSortedContests.length} of {contests.length} contests</span>
            {searchTerm && (
              <span className="inline-block mt-1 sm:mt-0 sm:ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Filtered by: "{searchTerm}"
              </span>
            )}
          </div>
        </div>
        
        {filteredAndSortedContests.length === 0 && contests.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
            <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No contests match your filters</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
              Try adjusting your search term or status filter
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        ) : contests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
            <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No contests found</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
              Get started by creating your first contest
            </p>
            <Link
              to="/admin/contests/new"
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Contest
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredAndSortedContests.map((contest) => (
              <div key={contest.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                {/* Card Header */}
                <div className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">
                      {contest.name}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contest)}`}>
                      {getStatusText(contest)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">ID: {contest.id}</p>
                  
                  {/* Countdown Timer */}
                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <CountdownTimer
                      targetDate={(() => {
                        const now = new Date();
                        const startTime = parseBackendUtcDate(contest.start_time);
                        
                        // If contest hasn't started yet, countdown to start
                        if (now < startTime) {
                          return contest.start_time;
                        }
                        // If contest is active, countdown to end
                        return contest.end_time;
                      })()}
                      label={(() => {
                        const now = new Date();
                        const startTime = parseBackendUtcDate(contest.start_time);
                        
                        if (now < startTime) {
                          return "Starts In";
                        }
                        return "Ends In";
                      })()}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center text-gray-600">
                      <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="hidden sm:inline">{(contest.entry_count || 0).toLocaleString()} entries</span>
                      <span className="sm:hidden">{(contest.entry_count || 0)}</span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      <span className="hidden sm:inline">
                        Ends: {formatDateInAdminTimezone(contest.end_time, localStorage.getItem('adminTimezone') || 'America/New_York', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span className="sm:hidden">
                        {formatDateInAdminTimezone(contest.end_time, localStorage.getItem('adminTimezone') || 'America/New_York', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
                  {/* Mobile: Stacked Layout */}
                  <div className="block sm:hidden space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/enter/${contest.id}`)}
                        className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/admin/contests/${contest.id}/edit`)}
                        className="inline-flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/contests/${contest.id}/entries`)}
                      className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Entries
                    </button>
                    
                    {/* Danger Zone - Delete Button */}
                    <div className="pt-3 mt-3 border-t border-red-200">
                      <button
                        onClick={() => handleDeleteClick(contest)}
                        className="w-full inline-flex justify-center items-center px-3 py-2 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Contest
                      </button>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Backend API support pending
                      </p>
                    </div>
                  </div>

                  {/* Desktop/Tablet: Grid Layout */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        onClick={() => navigate(`/enter/${contest.id}`)}
                        className="inline-flex justify-center items-center px-2 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/admin/contests/${contest.id}/edit`)}
                        className="inline-flex justify-center items-center px-2 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => navigate(`/admin/contests/${contest.id}/entries`)}
                        className="inline-flex justify-center items-center px-2 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Entries
                      </button>
                    </div>
                    
                    {/* Danger Zone - Delete Button */}
                    <div className="pt-2 border-t border-red-200">
                      <button
                        onClick={() => handleDeleteClick(contest)}
                        className="w-full inline-flex justify-center items-center px-2 py-2 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Contest
                      </button>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Backend API support pending
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Contest"
        message={`Are you sure you want to delete "${contestToDelete?.name}"? This action cannot be undone and will permanently remove the contest and all associated entries.`}
        confirmText="Delete Contest"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default AdminContests;
