import React, { createContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

// Maintaining the context export to avoid breaking legacy pages (SignPage, OnboardingForm, etc.)
// even though the modern flow uses useAuth and standalone data fetching.
export const PortalContext = createContext({});

/**
 * PortalGuard acts as an authentication wall for protected routes.
 * It ensures the user is authenticated before rendering sub-routes via <Outlet />.
 */
export default function PortalGuard() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-[#033F99] mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render protected child routes
  return <Outlet />;
}
