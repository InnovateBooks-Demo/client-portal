import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Key, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export default function OnboardingEntry() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState(null);
  
  // Password setup state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      try {
        setLoading(true);
        // Step 1: Public Handshake (MANDATORY - NO /me calls here)
        const res = await fetch(`${API_BASE}/api/client-portal/onboarding/validate/${token}`);
        const json = await res.json();
        
        if (!json.valid) {
          setError("Access Denied — invalid or revoked");
          setReason(json.reason);
          return;
        }

        setData(json);
        if (json.lead_id) {
          localStorage.setItem('lead_id', json.lead_id);
        }

        if (json.user_exists) {
            // Case 1: Existing User -> Redirect to login with pre-fill and redirect context
            // Land them on the onboarding form after login
            const redirectPath = `/onboarding/form/${token}`;
            navigate(`/login?email=${encodeURIComponent(json.email)}&redirect=${encodeURIComponent(redirectPath)}`);
            return;
        }

        // Case 2: New User -> Stay here and show password setup form
        setShowPasswordForm(true);
      } catch (err) {
        console.error("Token validation error:", err);
        setError("Network error validating invitation");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token, navigate]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirm) {
      setFormError("Passwords do not match");
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch(`${API_BASE}/api/client-portal/onboarding/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password })
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.detail || "Failed to set password");

      // Strict flow: Redirect to login after setup (DO NOT auto-login)
      navigate(`/login?email=${encodeURIComponent(data.email)}&from=onboarding`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <Loader2 className="h-10 w-10 animate-spin text-[#033F99] mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Verifying your secure invitation...</p>
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
            {reason === 'expired' ? "This invitation link has expired for security reasons." : 
             reason === 'revoked' ? "This invitation has been revoked or already completed." :
             "The link you followed is invalid or has been corrupted."}
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Please contact your account representative
          </div>
        </div>
      </div>
    );
  }

  if (showPasswordForm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#033F99]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#033F99]">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Secure Account Setup</h2>
            <p className="text-slate-500 text-sm">Create a password to access your secure client portal.</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Login Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input 
                  type="email" 
                  value={data?.email || ''} 
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 text-slate-900 font-medium cursor-not-allowed" 
                  disabled 
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">New Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input 
                  type="password" 
                  required
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full bg-slate-50 focus:bg-white border-2 border-transparent focus:border-[#033F99]/20 rounded-2xl py-4 pl-12 text-slate-900 font-medium transition-all outline-none" 
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Verify Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input 
                  type="password" 
                  required
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={e => setForm({...form, confirm: e.target.value})}
                  className="w-full bg-slate-50 focus:bg-white border-2 border-transparent focus:border-[#033F99]/20 rounded-2xl py-4 pl-12 text-slate-900 font-medium transition-all outline-none" 
                />
              </div>
            </div>

            {formError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {formError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={formLoading}
              className="w-full bg-[#033F99] hover:bg-[#02337d] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#033F99]/20 transition-all flex items-center justify-center gap-2"
            >
              {formLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
