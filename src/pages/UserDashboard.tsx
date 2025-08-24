import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isUser, getCurrentUser } from '../utils/auth';

interface Contest {
  id: number;
  name: string;
  description: string;
  status: string;
  prize_description: string;
  start_time: string;
  end_time: string;
  sponsor_name: string;
  image_url?: string;
}

interface UserEntry {
  id: number;
  contest_id: number;
  contest_name: string;
  entry_date: string;
  status: string;
}

const UserDashboard: React.FC = () => {
  const [availableContests, setAvailableContests] = useState<Contest[]>([]);
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!isUser()) {
      window.location.href = '/login';
      return;
    }

    // Fetch user's data
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // TODO: Replace with actual API calls
      // const contestsResponse = await fetch('/api/contests/available');
      // const entriesResponse = await fetch('/api/user/entries');
      
      // Mock data for now
      const mockContests: Contest[] = [
        {
          id: 1,
          name: "Summer Giveaway",
          description: "Win amazing summer prizes including beach gear and vacation packages!",
          status: "active",
          prize_description: "Beach vacation package worth $2,000",
          start_time: "2024-06-01T00:00:00Z",
          end_time: "2024-08-31T23:59:59Z",
          sponsor_name: "Summer Fun Co.",
          image_url: "https://example.com/summer.jpg"
        },
        {
          id: 2,
          name: "Tech Gadget Giveaway",
          description: "Enter to win the latest tech gadgets and electronics!",
          status: "active",
          prize_description: "iPhone 15 Pro and accessories",
          start_time: "2024-07-01T00:00:00Z",
          end_time: "2024-09-30T23:59:59Z",
          sponsor_name: "TechWorld",
          image_url: "https://example.com/tech.jpg"
        }
      ];

      const mockEntries: UserEntry[] = [
        {
          id: 1,
          contest_id: 1,
          contest_name: "Summer Giveaway",
          entry_date: "2024-06-15T10:30:00Z",
          status: "active"
        }
      ];

      setAvailableContests(mockContests);
      setUserEntries(mockEntries);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Contestlet!</h1>
        <p className="mt-2 text-gray-600">
          Discover and enter amazing contests to win incredible prizes
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Contests</p>
              <p className="text-2xl font-semibold text-gray-900">{availableContests.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Entries</p>
              <p className="text-2xl font-semibold text-gray-900">{userEntries.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Entries</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userEntries.filter(entry => entry.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Contests */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Available Contests</h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter these contests for a chance to win amazing prizes
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableContests.map((contest) => (
              <div key={contest.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                {contest.image_url && (
                  <div className="mb-4">
                    <img
                      src={contest.image_url}
                      alt={contest.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <h3 className="text-lg font-medium text-gray-900 mb-2">{contest.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{contest.description}</p>
                <div className="mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {contest.status}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">Sponsored by {contest.sponsor_name}</span>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900">Prize:</p>
                  <p className="text-sm text-gray-600">{contest.prize_description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <p>Ends: {new Date(contest.end_time).toLocaleDateString()}</p>
                  </div>
                  <Link
                    to={`/enter/${contest.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Enter Contest
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My Entries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">My Contest Entries</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track your contest participation and results
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {userEntries.length > 0 ? (
            userEntries.map((entry) => (
              <div key={entry.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{entry.contest_name}</h3>
                    <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                      <span>Entry Date: {new Date(entry.entry_date).toLocaleDateString()}</span>
                      <span>Status: <span className="font-medium capitalize">{entry.status}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/enter/${entry.contest_id}`}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Contest
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No entries yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start participating by entering one of the available contests above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
