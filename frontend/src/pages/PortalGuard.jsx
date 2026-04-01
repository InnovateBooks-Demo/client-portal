import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Key, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function PortalGuard() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userExists, setUserExists] = useState(false);
  
  // Auth Form State
  const [authForm, setAuthForm] = useState({ password: '', confirm: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const fetchHandshake = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/client-portal/${token}/handshake`);
        
        if (res.status === 403) {
            // Specific handling for expired/invalid tokens
            navigate(`/portal/expired/${token}`);
            return;
        }

        if (!res.ok) {
          throw new Error("Access Denied — Link invalid or corrupted");
        }
        const json = await res.json();
        setData(json); 
        
        if (json.user_exists) {
            // User already set up their account, redirect to login
            navigate(`/login?email=${json.email}`);
            return;
        }
        
        setUserExists(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHandshake();
  }, [token, navigate]);

  // Redirect if already authenticated and we have the handshake data (optional, maybe they want to switch accounts?)
  // For now, let's just let them log in to the specific organization context of the token.

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    if (!userExists && authForm.password !== authForm.confirm) {
        setAuthError("Passwords do not match");
        setAuthLoading(false);
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/api/client-portal/setup-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                password: authForm.password
            })
        });
        const json = await res.json();
        
        if (!res.ok) throw new Error(json.detail || "Authentication failed");
        
        // Log in via context
        login(json.access_token);
        
        // Redirect to the specific contract within the dashboard
        navigate(`/contracts/${data.contract_id}`);
    } catch (err) {
        setAuthError(err.message);
    } finally {
        setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[#F8FAFC]">
        <Loader2 className="h-10 w-10 animate-spin text-[#033F99] mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Authenticating secure link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100">
           <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-rose-500">
              <ShieldCheck className="h-10 w-10" />
           </div>
           <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase tracking-widest">Access Denied</h2>
           <p className="text-slate-500 font-medium mb-8 leading-relaxed">
             {error}. <br/>
             If you believe this is a mistake, please contact your account representative.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-layout" style={{justifyContent: 'center', alignItems: 'center', height: '100vh', display: 'flex'}}>
        <div className="glass-panel" style={{maxWidth: '430px', width: '100%', padding: '2.5rem', borderRadius: '16px'}}>
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
              <div style={{display: 'inline-flex', padding: '1rem', background: 'rgba(59,130,246,0.1)', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.2)'}}>
                  <Lock size={36} style={{color: 'var(--primary)'}} />
              </div>
              <h2 style={{margin: '0 0 0.75rem 0', fontSize: '1.75rem'}}>Setup Your Account</h2>
              <p style={{margin: 0, color: 'var(--text-muted)', lineHeight: '1.5'}}>
                  Set a secure password to access your contracts and onboarding documents.
              </p>
          </div>
          
          <form onSubmit={handleAuthSubmit}>
              <div className="form-group" style={{marginBottom: '1.25rem'}}>
                  <label className="form-label" style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}><Mail size={16}/> Email Address</label>
                  <input 
                      type="email" 
                      value={data?.email || ''} 
                      className="form-control" 
                      disabled 
                  />
              </div>
              
              <div className="form-group" style={{marginBottom: '1.25rem'}}>
                  <label className="form-label" style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}><Key size={16}/> Create Password</label>
                  <input 
                      type="password" 
                      value={authForm.password}
                      onChange={e => setAuthForm({...authForm, password: e.target.value})}
                      className="form-control" 
                      required 
                      placeholder="Enter a secure password"
                  />
              </div>
              
              <div className="form-group" style={{marginBottom: '1.25rem'}}>
                  <label className="form-label" style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}><ShieldCheck size={16}/> Confirm Password</label>
                  <input 
                      type="password" 
                      value={authForm.confirm}
                      onChange={e => setAuthForm({...authForm, confirm: e.target.value})}
                      className="form-control" 
                      required 
                      placeholder="Confirm your password"
                  />
              </div>
              
              {authError && (
                  <div style={{color: '#ff6b6b', fontSize: '0.95rem', margin: '1rem 0', padding: '0.75rem', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', borderRadius: '6px', textAlign: 'center'}}>
                      {authError}
                  </div>
              )}
              
              <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.05rem', fontWeight: 600}} disabled={authLoading}>
                  {authLoading ? <Loader2 size={18} className="spinner"/> : 'Setup & Continue'}
              </button>
          </form>
        </div>
    </div>
  );
}
