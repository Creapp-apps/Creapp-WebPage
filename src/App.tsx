import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProposalView from './pages/ProposalView';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import ProposalEditor from './pages/admin/ProposalEditor';
import ControlCenter from './pages/admin/ControlCenter';
import AuthGuard from './components/auth/AuthGuard';
import { SmoothScroll } from './components/systems/SmoothScroll';

// Restore native cursor on non-landing pages
const CursorRestorer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    const isLanding = location.pathname === '/';
    if (!isLanding) {
      document.body.classList.add('admin-cursor');
    } else {
      document.body.classList.remove('admin-cursor');
    }
    return () => {
      document.body.classList.remove('admin-cursor');
    };
  }, [location.pathname]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <CursorRestorer>
        <SmoothScroll>
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
        </SmoothScroll>
      </CursorRestorer>
    </BrowserRouter>
  );
};

export default App;
