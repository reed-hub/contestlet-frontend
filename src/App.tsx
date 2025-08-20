import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ContestAuth from './pages/ContestAuth';
import ContestSuccess from './pages/ContestSuccess';
import ContestEntryPage from './pages/ContestEntryPage';
import MyEntries from './pages/MyEntries';
import AdminLogin from './pages/AdminLogin';
import AdminContests from './pages/AdminContests';
import NewContest from './pages/NewContest';
import ContestEntries from './pages/ContestEntries';

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
          <Route path="admin" element={<AdminLogin />} />
          <Route path="admin/contests" element={<AdminContests />} />
          <Route path="admin/contests/new" element={<NewContest />} />
          <Route path="admin/contests/:contest_id/entries" element={<ContestEntries />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
