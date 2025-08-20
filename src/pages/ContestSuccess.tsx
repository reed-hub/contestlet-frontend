import React from 'react';
import { useParams, Link } from 'react-router-dom';

const ContestSuccess: React.FC = () => {
  const { contest_id } = useParams<{ contest_id: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🎉 You're In!</h1>
          <p className="text-xl text-gray-600 mb-6">
            You've successfully entered the contest!
          </p>
          
          {contest_id && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">Contest ID: {contest_id}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>✨ You'll be notified if you win</p>
              <p>📱 Keep your phone handy for updates</p>
              <p>🎁 Good luck in the contest!</p>
            </div>
            
            <div className="flex flex-col gap-3 mt-8">
              <Link
                to="/"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                Enter Another Contest
              </Link>
              <Link
                to="/my-entries"
                className="border-2 border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors"
              >
                View My Entries
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestSuccess;
