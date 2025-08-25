import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ContestAuth from './pages/ContestAuth';
import ContestSuccess from './pages/ContestSuccess';
import ContestEntryPage from './pages/ContestEntryPage';
import MyEntries from './pages/MyEntries';
import UniversalLogin from './pages/AdminLogin';
import AdminContests from './pages/AdminContests';
import NewContest from './pages/NewContest';
import EditContest from './pages/EditContest';
import ContestEntries from './pages/ContestEntries';
import NotificationLogs from './pages/NotificationLogs';
import AdminProfile from './pages/AdminProfile';
import Settings from './pages/Settings';
import SponsorDashboard from './pages/SponsorDashboard';
import SponsorContests from './pages/SponsorContests';
import SponsorCreateContest from './pages/SponsorCreateContest';
import SponsorEditContest from './pages/SponsorEditContest';
import UserDashboard from './pages/UserDashboard';
import RoleBasedRoute from './components/RoleBasedRoute';
import RoleTester from './components/RoleTester';
import RoleUpgradeForm from './components/RoleUpgradeForm';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="enter/:contest_id" element={<ContestAuth />} />
          <Route path="contest/:contest_id/success" element={<ContestSuccess />} />
          <Route path="contest/:contest_id/details" element={<ContestEntryPage />} />
          <Route path="my-entries" element={<MyEntries />} />
          
          {/* Role Testing (Development Only) */}
          <Route path="role-tester" element={<RoleTester />} />
          
          {/* Role Upgrade */}
          <Route path="upgrade-to-sponsor" element={<RoleUpgradeForm />} />
          
          {/* Universal Login */}
          <Route path="login" element={<UniversalLogin />} />
          
          {/* Admin Routes */}
          <Route path="admin" element={<UniversalLogin />} />
          <Route path="admin/contests" element={<AdminContests />} />
          <Route path="admin/contests/new" element={<NewContest />} />
          <Route path="admin/contests/:contest_id/edit" element={<EditContest />} />
          <Route path="admin/contests/:contest_id/entries" element={<ContestEntries />} />
          <Route path="admin/notifications" element={<NotificationLogs />} />
          <Route path="admin/profile" element={<AdminProfile />} />
          
          {/* Settings Route */}
          <Route path="settings" element={<Settings />} />
          
          {/* Sponsor Routes */}
          <Route path="sponsor/dashboard" element={
            <RoleBasedRoute allowedRoles={['sponsor', 'admin']}>
              <SponsorDashboard />
            </RoleBasedRoute>
          } />
          <Route path="sponsor/contests" element={
            <RoleBasedRoute allowedRoles={['sponsor', 'admin']}>
              <SponsorContests />
            </RoleBasedRoute>
          } />
          <Route path="sponsor/contests/new" element={
            <RoleBasedRoute allowedRoles={['sponsor', 'admin']}>
              <SponsorCreateContest />
            </RoleBasedRoute>
          } />
          <Route path="sponsor/contests/:contest_id/edit" element={
            <RoleBasedRoute allowedRoles={['sponsor', 'admin']}>
              <SponsorEditContest />
            </RoleBasedRoute>
          } />
          
          {/* User Routes */}
          <Route path="user/dashboard" element={
            <RoleBasedRoute allowedRoles={['user', 'sponsor', 'admin']}>
              <UserDashboard />
            </RoleBasedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
