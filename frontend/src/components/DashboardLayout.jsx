import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, User, ShieldCheck, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="centered-message">
        <div className="spinner" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', width: '40px', height: '40px' }} />
        <p style={{ marginTop: '1rem' }}>Loading your secure environment...</p>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-theme">
      <div className="portal-layout">
        <aside className="sidebar">
          <div style={{ marginBottom: '3rem', padding: '0 1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'white', fontWeight: 800 }}>Revenue Portal</h2>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'rgba(255,255,255,0.6)' }}>Secure Multi-Contract Space</p>
          </div>

          <nav style={{ flex: 1 }}>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => `step-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <div className="step-icon"><LayoutDashboard size={18} /></div>
              <span>My Dashboard</span>
            </NavLink>

            <NavLink
              to="/details"
              className={({ isActive }) => `step-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <div className="step-icon"><Building2 size={18} /></div>
              <span>Company Details</span>
            </NavLink>

            <div style={{ marginTop: '2.5rem', marginBottom: '0.75rem', padding: '0 1rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>Organization</span>
            </div>

            {/* <NavLink 
              to="/settings" 
              className={({isActive}) => `step-item ${isActive ? 'active' : ''}`}
              style={{textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem'}}
            >
              <div className="step-icon"><Settings size={18} /></div>
              <span>Settings</span>
            </NavLink> */}

            <button
              onClick={handleLogout}
              className="step-item"
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}
            >
              <div className="step-icon" style={{ background: 'rgba(255,255,255,0.1)' }}><LogOut size={18} /></div>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Sign Out</span>
            </button>
          </nav>

          <div style={{
            marginTop: 'auto',
            padding: '1.25rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'white',
              color: '#033F99',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>{user?.name || 'User'}</p>
              <p style={{ fontSize: '0.7rem', margin: 0, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
            </div>
          </div>
        </aside>

        <main className="main-content" style={{ maxWidth: '1440px', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
