import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export default function OnboardingForm() {
  const { token } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [formData, setFormData] = useState({
    legal_name: '',
    address: '',
    gst: '',
    billing_contact: '',
    admin_contact: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Authenticated fetch: Resolve pending lead via session
        const res = await fetch(`${API_BASE}/api/client-portal/onboarding/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        let json = null;
        try {
          json = await res.json();
        } catch (e) {
          json = null;
        }
        
        if (!res.ok) {
          throw new Error(json?.detail || `No active onboarding found: ${res.status}`);
        }
        
        setData(json);
        // Pre-fill from lead info if available
        setFormData(prev => ({
          ...prev,
          legal_name: json.company_name || prev.legal_name,
          billing_contact: json.email || prev.billing_contact
        }));
      } catch (err) {
        setToast({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) fetchData();
  }, [accessToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = async (e) => {
    e?.preventDefault();
    if (!formData.legal_name || !formData.address || !formData.gst || !formData.billing_contact) {
      setToast({ type: 'error', text: "Please fill all required fields" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/onboarding/me/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          data: formData
        })
      });
      
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        json = null;
      }

      if (!res.ok) {
        throw new Error(json?.detail || `Failed to submit onboarding: ${res.status}`);
      }
      
      setToast({ type: 'success', text: "Onboarding complete! Generating your contract..." });
      
      // Atomic Redirect: Hand off to the newly created contract
      setTimeout(() => {
        navigate(`/contracts/${json.contract_id}`);
      }, 1500);
      
    } catch (err) {
      setToast({ type: 'error', text: err.message });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{margin: 0}}>Company Information</h2>
        <p style={{margin: 0}}>Please complete this form to set up your account.</p>
      </div>

      <form onSubmit={handleNext}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
          
          <div className="form-group" style={{gridColumn: '1 / -1'}}>
            <label className="form-label">Legal Company Name *</label>
            <input 
              name="legal_name"
              value={formData.legal_name}
              onChange={handleChange}
              className="form-control" 
              placeholder="Full legal entity name"
              required 
            />
          </div>
          
          <div className="form-group" style={{gridColumn: '1 / -1'}}>
            <label className="form-label">Registered Address *</label>
            <textarea 
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="form-control" 
              rows="3"
              placeholder="Full physical billing address"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">GST / Tax ID *</label>
            <input 
              name="gst"
              value={formData.gst}
              onChange={handleChange}
              className="form-control" 
              placeholder="e.g. 27AAAAA0000A1Z5"
              required 
            />
          </div>
          <div />

          <div className="form-group">
            <label className="form-label">Billing Contact Email *</label>
            <input 
              type="email"
              name="billing_contact"
              value={formData.billing_contact}
              onChange={handleChange}
              className="form-control" 
              placeholder="finance@company.com"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Admin Contact Email</label>
            <input 
              type="email"
              name="admin_contact"
              value={formData.admin_contact}
              onChange={handleChange}
              className="form-control" 
              placeholder="admin@company.com"
            />
          </div>

        </div>

        <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '2rem'}}>
          <button type="submit" disabled={saving} className="btn btn-ghost" style={{color: 'var(--primary)'}}>
            {saving ? <span className="spinner"></span> : <Save size={18} />} Save Draft
          </button>
          
          <button type="button" onClick={handleNext} disabled={saving} className="btn btn-primary">
            Proceed to Sign <CheckCircle2 size={18} />
          </button>
        </div>
      </form>

      {toast && (
        <div className="toast-container">
          <div className="toast" style={{borderColor: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)'}}>
            {toast.type === 'success' ? <CheckCircle2 size={20} color="var(--accent)" /> : <AlertCircle size={20} color="var(--danger)" />}
            <span style={{fontWeight: 500}}>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
