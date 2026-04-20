import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ClipboardList, PenTool, CheckCircle2, AlertCircle,
  Upload, Download, Save, ShieldCheck, ExternalLink, Trash2, Clock, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import AuditTimeline from '../components/AuditTimeline';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export default function ContractDashboard() {
  const { contract_id } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshAudit, setRefreshAudit] = useState(0);

  // Form states
  const [onboarding, setOnboarding] = useState({
    legal_name: '', address: '', gst: '', billing_contact: '', admin_contact: '',
    documents: { gst_certificate: '', pan_card: '', agreement_docs: [] }
  });
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [uploading, setUploading] = useState(null); // field name being uploaded

  const debouncedOnboarding = useDebounce(onboarding, 1000);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/contracts/${contract_id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.onboarding) {
          setOnboarding(prev => ({
            ...prev,
            ...json.onboarding,
            documents: {
              gst_certificate: json.onboarding.documents?.gst_certificate || '',
              pan_card: json.onboarding.documents?.pan_card || '',
              agreement_docs: json.onboarding.documents?.agreement_docs || []
            }
          }));
        }
      } else {
        throw new Error(json.detail || "Failed to fetch contract details");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contract_id, accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-save logic
  useEffect(() => {
    const autoSave = async () => {
      // Only auto-save if data is loaded and not already signed
      if (!data || data.status === 'SIGNED' || saveStatus === 'saving' || loading) return;

      setSaveStatus('saving');
      try {
        const res = await fetch(`${API_BASE}/api/client-portal/onboarding/${contract_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(debouncedOnboarding)
        });
        if (res.ok) {
          setSaveStatus('saved');
          setRefreshAudit(prev => prev + 1);
          setTimeout(() => setSaveStatus('idle'), 3000);
          // Optional: Re-fetch for updated status counters
          const updateRes = await fetch(`${API_BASE}/api/client-portal/contracts/${contract_id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const updateJson = await updateRes.json();
          if (updateJson.success) setData(updateJson);
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        setSaveStatus('error');
      }
    };

    // Prevent initial mount empty save
    if (loading) return;

    // Simple check if anything changed vs what we fetched
    // (Ideally a deep comparison, but for now we rely on the debounced value change)
    if (JSON.stringify(onboarding) !== JSON.stringify(data?.onboarding || {})) {
      autoSave();
    }

  }, [debouncedOnboarding]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOnboarding(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(field);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/client-portal/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setRefreshAudit(prev => prev + 1);
        if (field === 'agreement_docs') {
          setOnboarding(prev => ({
            ...prev,
            documents: { ...prev.documents, agreement_docs: [...prev.documents.agreement_docs, json.file_url] }
          }));
        } else {
          setOnboarding(prev => ({
            ...prev,
            documents: { ...prev.documents, [field]: json.file_url }
          }));
        }
      } else {
        alert(json.detail || "Upload failed");
      }
    } catch (err) {
      alert("System error during upload");
    } finally {
      setUploading(null);
    }
  };

  const handleSign = async () => {
    if (data.status === 'SIGNED') return;
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/sign/${contract_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          client_name: onboarding.legal_name || data.lead_data?.company_name || 'Authorized Client',
          client_email: onboarding.billing_contact || data.user_email || '',
          timestamp: new Date().toISOString()
        })
      });
      const json = await res.json();
      if (json.success) {
        setRefreshAudit(prev => prev + 1);
        fetchData(); // Reload to capture signed status
      } else {
        alert(json.detail || "Signing failed");
      }
    } catch (err) {
      alert("Error occurred while signing");
    }
  };

  if (loading) return (
    <div className="centered-message">
      <div className="spinner" style={{ width: '40px', height: '40px' }} />
      <p style={{ marginTop: '1rem' }}>Securing document workspace...</p>
    </div>
  );

  if (!data?.contract?.generated_content) return (
    <div className="centered-message">
      <AlertCircle size={48} style={{ color: '#94A3B8', marginBottom: '1rem' }} />
      <h2>No Contract Content</h2>
      <p>The contract document is not available for preview.</p>
      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
    </div>
  );

  const isSigned = data.status === 'SIGNED';

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.5s ease',
      padding: '0'
    }}>

      {/* Header Area (Fixed at Top) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <button
              className="btn"
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                background: 'white',
                border: '1px solid #E5E7EB',
                color: '#475569',
                fontWeight: 600,
                borderRadius: '10px'
              }}
            >
              ← Dashboard
            </button>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{contract_id}</h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748B' }}>
            Organization: <strong style={{ color: '#111827' }}>{data.contract.party_name}</strong> • Version: {data.version}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {saveStatus === 'saving' && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#033F99', fontSize: '0.85rem', fontWeight: 600 }}><Loader2 size={16} className="spinner" /> Saving...</div>}
          {saveStatus === 'saved' && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontSize: '0.85rem', fontWeight: 600 }}><CheckCircle2 size={16} /> Saved</div>}
          {isSigned && (
            <div className="status-pill-soft status-pill-signed">
              <ShieldCheck size={16} /> <span>Signed Copy</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace (Scrollable Panes) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
        gap: '2rem',
        flex: 1,
        minHeight: 0
      }}>

        {/* LEFT: Service Bond Pane (Simplified Rounded Look) */}
        <div style={{ minWidth: 0 }}>
          <div className="service-bond">
            <div className="bond-seal">
              Official<br />Record
            </div>

            <div 
              className="dynamic-contract-content"
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', color: '#1e293b' }}
              dangerouslySetInnerHTML={{ __html: data.contract.generated_content }} 
            />

            <div style={{ marginTop: 'auto', paddingTop: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', opacity: 0.6 }}>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>
                Synexos Digital Trust Network<br />
                Security Hash: {contract_id.split('-').pop()}...
              </div>
              <div style={{ width: '120px', height: '2px', background: '#F1F5F9' }} />
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar Pane (Scrollable) */}
        <div className="scroll-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          overflowY: 'auto',
          paddingRight: '0.75rem',
          height: '100%'
        }}>

          {/* Requirement Tracker Card */}
          <div className="side-card">
            <div className="side-card-title">
              <ClipboardList size={18} color="#033F99" />
              <span>Requirement Tracker</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className={`requirement-item ${onboarding_checklist.company_info ? 'completed' : ''}`}>
                {onboarding_checklist.company_info ? <CheckCircle2 size={16} /> : <Clock size={16} opacity={0.4} />}
                <span>Company Info</span>
              </div>
              <div className={`requirement-item ${onboarding_checklist.contacts ? 'completed' : ''}`}>
                {onboarding_checklist.contacts ? <CheckCircle2 size={16} /> : <Clock size={16} opacity={0.4} />}
                <span>Billing Contacts</span>
              </div>
              <div className={`requirement-item ${onboarding_checklist.tax_info ? 'completed' : ''}`}>
                {onboarding_checklist.tax_info ? <CheckCircle2 size={16} /> : <Clock size={16} opacity={0.4} />}
                <span>Tax Details</span>
              </div>
              <div className={`requirement-item ${onboarding_checklist.documents ? 'completed' : ''}`}>
                {onboarding_checklist.documents ? <CheckCircle2 size={16} /> : <Clock size={16} opacity={0.4} />}
                <span>Requirement Docs</span>
              </div>
            </div>
          </div>

          {/* Legal Entity Forms Card */}
          <div className="side-card" style={{ opacity: isSigned ? 0.6 : 1, pointerEvents: isSigned ? 'none' : 'auto' }}>
            <div className="side-card-title">
              <PenTool size={18} color="#033F99" />
              <span>Legal Entity Details</span>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="login-label">Legal Company Name</label>
              <input name="legal_name" value={onboarding.legal_name} onChange={handleInputChange} className="form-control" placeholder="Acme Corp Pvt Ltd" />
            </div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="login-label">Registered Address</label>
              <textarea name="address" value={onboarding.address} onChange={handleInputChange} className="form-control" rows="2" placeholder="Full billing address..." />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="login-label">GST Number</label>
              <input name="gst" value={onboarding.gst} onChange={handleInputChange} className="form-control" placeholder="27AAAAA0000A1Z5" />
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FileUploader
                  label="GST Certificate"
                  field="gst_certificate"
                  url={onboarding.documents.gst_certificate}
                  onUpload={handleFileUpload}
                  uploading={uploading === 'gst_certificate'}
                />
                <FileUploader
                  label="PAN Card Copy"
                  field="pan_card"
                  url={onboarding.documents.pan_card}
                  onUpload={handleFileUpload}
                  uploading={uploading === 'pan_card'}
                />
              </div>
            </div>

            {!isSigned ? (
              <button
                className="login-submit-btn"
                style={{ width: '100%', padding: '1.25rem', fontSize: '1rem' }}
                disabled={!onboarding_checklist.company_info || !onboarding_checklist.tax_info}
                onClick={handleSign}
              >
                <span>Confirm Agreement</span>
                <ArrowRight size={18} style={{ marginLeft: '8px' }} />
              </button>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.25rem', background: '#F0FDF4', borderRadius: '14px', border: '1px solid #DCFCE7' }}>
                <CheckCircle2 size={28} color="#15803D" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ margin: 0, color: '#15803D', fontWeight: 700 }}>Contract Signed</h4>
                <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', color: '#166534', fontWeight: 500 }}>{new Date(data.signed_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Activity Timeline Card */}
          {/* <div className="side-card">
            <div className="side-card-title">
              <Clock size={18} color="#033F99" />
              <span>Activity Timeline</span>
            </div>
            <div className="timeline-wrapper">
              <AuditTimeline contractId={contract_id} accessToken={accessToken} refreshTrigger={refreshAudit} />
            </div>
          </div> */}

        </div>
      </div>
    </div>
  );
}

// Sub-component for File Uploads
const FileUploader = ({ label, field, url, onUpload, uploading }) => (
  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ overflow: 'hidden', paddingRight: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>{label}</span>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#033F99', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
            <ExternalLink size={12} /> View Document
          </a>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Pending upload</span>
        )}
      </div>

      <label className="btn" style={{
        padding: '0.4rem 0.8rem',
        fontSize: '0.75rem',
        cursor: 'pointer',
        background: 'white',
        border: '1px solid #E2E8F0',
        color: '#475569'
      }}>
        {uploading ? <Loader2 size={14} className="spinner" /> : <><Upload size={14} style={{ marginRight: '4px' }} /> {url ? 'Replace' : 'Upload'}</>}
        <input type="file" onChange={(e) => onUpload(e, field)} style={{ display: 'none' }} disabled={uploading} />
      </label>
    </div>
  </div>
);
