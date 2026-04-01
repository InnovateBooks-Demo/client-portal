import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  // Get email from query params if coming from PortalGuard redirect
  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || '';

  const [form, setForm] = useState({ email: initialEmail, password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/client-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.detail || 'Invalid email or password');
      }

      // Log in via context
      login(json.access_token);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-layout" style={{justifyContent: 'center', alignItems: 'center', height: '100vh', display: 'flex'}}>
      <div className="glass-panel" style={{maxWidth: '430px', width: '100%', padding: '2.5rem', borderRadius: '16px'}}>
        <div style={{textAlign: 'center', marginBottom: '2.5rem'}}>
          <div style={{display: 'inline-flex', padding: '1rem', background: 'rgba(59,130,246,0.1)', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.2)'}}>
            <ShieldCheck size={40} style={{color: 'var(--primary)'}} />
          </div>
          <h2 style={{margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 800}}>Client Portal</h2>
          <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem'}}>Securely access your contracts and onboarding documents.</p>
        </div>

        {error && (
          <div style={{
            color: '#ff6b6b', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem', 
            padding: '0.75rem', 
            background: 'rgba(255, 107, 107, 0.1)', 
            border: '1px solid rgba(255, 107, 107, 0.2)', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Lock size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Mail size={14} /> Email Address
            </label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="name@company.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
            />
          </div>

          <div className="form-group" style={{marginBottom: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
              <label className="form-label" style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Lock size={14} /> Password
              </label>
            </div>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{width: '100%', padding: '1rem', fontSize: '1rem'}}
            disabled={loading}
          >
            {loading ? <Loader2 className="spinner" /> : (
              <>Sign In <ArrowRight size={18} style={{marginLeft: '8px'}} /></>
            )}
          </button>
        </form>

        <div style={{marginTop: '2rem', textAlign: 'center'}}>
          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
            Protected by InnovateBook Secure Cloud
          </p>
        </div>
      </div>
    </div>
  );
}
