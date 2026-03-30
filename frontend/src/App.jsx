import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PortalGuard from './pages/PortalGuard.jsx';
import ExpiredLinkPage from './pages/ExpiredLinkPage.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ContractDashboard from './pages/ContractDashboard.jsx';
import LoginPage from './pages/LoginPage.jsx';

// Standard catch-all for genuinely invalid (non-expired) tokens
const InvalidPortal = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-full max-w-md bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100">
      <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase tracking-widest">Invalid Link</h2>
      <p className="text-slate-500 font-medium mb-8">This portal link is invalid, corrupted, or has been revoked by the sender.</p>
      <p className="text-sm font-bold text-slate-400">Please contact your account representative for a new invitation.</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Initial Entry Point - Token Handshake & Auth Wall */}
          <Route path="/portal/:token" element={<PortalGuard />} />
          <Route path="/portal/expired/:token" element={<ExpiredLinkPage />} />
          <Route path="/portal/invalid" element={<InvalidPortal />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Dashboard Experience */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contracts/:contract_id" element={<ContractDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
