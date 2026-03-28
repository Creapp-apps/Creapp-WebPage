import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProposalView from './pages/ProposalView';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import ProposalEditor from './pages/admin/ProposalEditor';
import ControlCenter from './pages/admin/ControlCenter';
import AuthGuard from './components/auth/AuthGuard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/propuesta/:slug" element={<ProposalView />} />

        {/* Admin Routes (Protected) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AuthGuard><AdminPanel /></AuthGuard>} />
        <Route path="/admin/propuesta/:id" element={<AuthGuard><ProposalEditor /></AuthGuard>} />
        <Route path="/admin/propuesta/nueva" element={<AuthGuard><ProposalEditor /></AuthGuard>} />
        <Route path="/admin/control-center" element={<AuthGuard><ControlCenter /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
