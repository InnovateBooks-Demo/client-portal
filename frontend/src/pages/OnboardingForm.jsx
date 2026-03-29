import React, { useContext, useState, useEffect } from 'react';
import { PortalContext } from './PortalGuard.jsx';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingForm() {
  const { data, token, refreshData, accessToken } = useContext(PortalContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    legal_name: '',
    address: '',
    gst: '',
    billing_contact: '',
    admin_contact: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Populate existing data
    if (data?.onboarding) {
      setFormData(prev => ({
        ...prev,
        legal_name: data.onboarding.legal_name || data.lead?.company_name || '',
        address: data.onboarding.address || '',
        gst: data.onboarding.gst || '',
        billing_contact: data.onboarding.billing_contact || data.lead?.contact_email || '',
        admin_contact: data.onboarding.admin_contact || ''
      }));
    } else if (data?.lead) {
       setFormData(prev => ({
         ...prev,
         legal_name: data.lead.company_name || '',
         billing_contact: data.lead.contact_email || ''
       }));
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/client-portal/${token}/onboarding`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Failed to save data");
      
      setToast({ type: 'success', text: "Onboarding details saved successfully" });
      await refreshData();
      
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = formData.legal_name && formData.address && formData.gst && formData.billing_contact;

  const handleNext = async () => {
    await handleSave();
    if (isFormValid) {
       navigate('/portal/sign');
    } else {
       setToast({ type: 'error', text: "Please fill all required fields before proceeding." });
       setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="glass-panel">
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{margin: 0}}>Company Information</h2>
        <p style={{margin: 0}}>Please complete this form to set up your account.</p>
      </div>

      <form onSubmit={handleSave}>
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
