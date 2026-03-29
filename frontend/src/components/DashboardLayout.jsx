import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="centered-message">
        <div className="spinner" style={{borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', width: '40px', height: '40px'}} />
        <p style={{marginTop: '1rem'}}>Loading your secure environment...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className="centered-message error-page">
            <ShieldCheck size={64} style={{color: 'var(--danger)', marginBottom: '1rem'}} />
            <h2>Session Expired</h2>
            <p>Please log in through your secure link email.</p>
            <button className="btn btn-primary" onClick={() => navigate('/portal/invalid')}>Go Back</button>
        </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="portal-layout">
      <aside className="sidebar">
        <div style={{marginBottom: '3rem', padding: '0 1rem'}}>
          <h2 className="bg-gradient-text" style={{margin: 0, fontSize: '1.4rem'}}>Revenue Portal</h2>
          <p style={{fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-muted)'}}>Secure Multi-Contract Space</p>
        </div>
        
        <nav style={{flex: 1}}>
          <NavLink 
            to="/dashboard" 
            end
            className={({isActive}) => `step-item ${isActive ? 'active' : ''}`}
            style={{textDecoration: 'none'}}
          >
            <div className="step-icon"><LayoutDashboard size={18} /></div>
            <span>My Dashboard</span>
          </NavLink>

          <div style={{marginTop: '2rem', marginBottom: '0.5rem', padding: '0 1rem'}}>
             <span style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)'}}>Administration</span>
          </div>

          <button 
            onClick={handleLogout}
            className="step-item" 
            style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'rgba(239, 68, 68, 0.7)'}}
          >
            <div className="step-icon" style={{background: 'rgba(239, 68, 68, 0.1)'}}><LogOut size={18} /></div>
            <span>Sign Out</span>
          </button>
        </nav>
        
        <div style={{marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          <div style={{width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem'}}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div style={{overflow: 'hidden'}}>
            <p style={{fontSize: '0.85rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff'}}>{user?.name || 'User'}</p>
            <p style={{fontSize: '0.7rem', margin: 0, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{user?.email}</p>
          </div>
        </div>
      </aside>
      
      <main className="main-content" style={{maxWidth: '1440px'}}>
        <Outlet />
      </main>
    </div>
  );
}
