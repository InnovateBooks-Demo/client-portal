import React, { useContext, useState } from 'react';
import { PortalContext } from './PortalGuard.jsx';
import { PenTool, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SignPage() {
  const { data, token, refreshData, accessToken } = useContext(PortalContext);
  
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const contract = data?.contract || {};

  const handleSign = async () => {
    if (!agreed) return;
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/${token}/sign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
           client_name: data?.onboarding?.legal_name || 'Client',
           client_email: data?.onboarding?.billing_contact || 'email@example.com',
           timestamp: new Date().toISOString()
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to sign contract");
      
      setSuccess(true);
      await refreshData();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (contract.contract_status === "SIGNED" || success) {
    return (
      <div className="glass-panel" style={{textAlign: 'center', padding: '4rem 2rem'}}>
        <div style={{display: 'inline-block', padding: '1.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '50%', marginBottom: '1.5rem'}}>
          <CheckCircle2 size={64} style={{color: 'var(--accent)'}} />
        </div>
        <h2 style={{color: 'var(--text-main)', margin: '0 0 1rem 0'}}>Contract Successfully Signed</h2>
        <p style={{color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto'}}>
          Thank you for confirming your agreement. A copy of the finalized document has been sent to your email.
        </p>
        <p style={{marginTop: '2rem', fontSize: '0.9rem'}}>Please close this page.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{margin: 0}}>Accept & Sign</h2>
        <p style={{margin: 0}}>Finalize your agreement.</p>
      </div>

      <div style={{background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--surface-border)'}}>
        <h3 style={{marginBottom: '1rem', color: '#fff'}}>Terms & Conditions</h3>
        <p style={{fontSize: '0.95rem', color: 'var(--text-muted)'}}>
          By executing this Agreement, you signify that you have read, understood, and accept our {contract.payment_terms || 'Net 30'} terms and the standard terms of service. You represent and warrant that you possess the legal authority to bind your organization to these terms.
        </p>
        
        <label className="custom-checkbox" style={{marginTop: '2rem'}}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <div className="checkmark">
            {agreed && <CheckCircle2 size={16} color="white" />}
          </div>
          <span style={{color: 'white', fontWeight: 500}}>
            I agree to the terms listed above and affix my electronic signature.
          </span>
        </label>
      </div>

      {error && (
        <div style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', color: '#fff', display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
           <AlertCircle size={20} color="var(--danger)"/> {error}
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--surface-border)', paddingTop: '2rem'}}>
        <button 
          onClick={handleSign}
          disabled={!agreed || signing}
          className="btn btn-success"
          style={{padding: '1rem 2rem', fontSize: '1.1rem'}}
        >
          {signing ? <span className="spinner"></span> : <><PenTool size={20} /> Sign Agreement</>}
        </button>
      </div>
    </div>
  );
}
