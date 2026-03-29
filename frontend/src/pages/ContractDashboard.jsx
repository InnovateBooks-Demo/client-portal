import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, ClipboardList, PenTool, CheckCircle2, AlertCircle, 
  Upload, Download, Save, ShieldCheck, ExternalLink, Trash2, Clock, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import AuditTimeline from '../components/AuditTimeline';

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
      const res = await fetch(`/api/client-portal/contracts/${contract_id}`, {
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
        const res = await fetch(`/api/client-portal/onboarding/${contract_id}`, {
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
          const updateRes = await fetch(`/api/client-portal/contracts/${contract_id}`, {
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
      const res = await fetch('/api/client-portal/upload', {
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
      const res = await fetch(`/api/client-portal/sign/${contract_id}`, {
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
       <div className="spinner" style={{width: '40px', height: '40px'}} />
       <p style={{marginTop: '1rem'}}>Securing document workspace...</p>
    </div>
  );

  if (error) return (
    <div className="centered-message error-page">
       <ShieldCheck size={64} style={{color: 'var(--danger)', marginBottom: '1rem'}} />
       <h2>Access Error</h2>
       <p>{error}</p>
       <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
    </div>
  );

  const isSigned = data.status === 'SIGNED';

  return (
    <div style={{height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease'}}>
      
      {/* Header Area */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem'}}>
                <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--primary)'}}>
                    ← Dashboard
                </button>
                <h1 style={{fontSize: '1.5rem', margin: 0}}>{contract_id}</h1>
            </div>
            <p style={{margin: 0, fontSize: '0.9rem'}}>Organization: <strong>{data.contract.party_name}</strong> • Version: {data.version}</p>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              {saveStatus === 'saving' && <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem'}}><Loader2 size={16} className="spinner"/> Saving...</div>}
              {saveStatus === 'saved' && <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.85rem'}}><CheckCircle2 size={16}/> All changes saved</div>}
              {isSigned && <div style={{background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '40px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center'}}><ShieldCheck size={16}/> Authenticated & Signed</div>}
          </div>
      </div>

      {/* Main Workspace 3-Pane Layout */}
      <div style={{flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', minHeight: 0}}>
        
        {/* LEFT: Contract Document Pane */}
        <div style={{overflowY: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', padding: '2rem'}}>
             <div className="contract-preview" style={{margin: 0, padding: '2.5rem', boxShadow: 'none', background: '#fff'}}>
                <div className="contract-header" style={{borderBottom: '2px solid #f1f5f9'}}>
                    <div>
                        <h2 style={{color: '#0f172a', margin:0, fontSize: '1.5rem'}}>Service Agreement</h2>
                        <p style={{color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase'}}>{contract_id}</p>
                    </div>
                </div>
                
                <div style={{color: '#334155', fontSize: '0.9rem'}}>
                    <h3 style={{color: '#0f172a', margin: '1.5rem 0 0.5rem', fontSize: '1rem'}}>1. Parties</h3>
                    <p>This agreement is made between <strong>InnovateBook Services</strong> and <strong>{data.contract.party_name}</strong>.</p>
                    
                    <h3 style={{color: '#0f172a', margin: '1.5rem 0 0.5rem', fontSize: '1rem'}}>2. Commercial Value</h3>
                    <p>Total Estimated Value: <strong>₹{data.contract.total_value?.toLocaleString()}</strong></p>
                    <p>Standard Payment Terms: <strong>{data.contract.payment_terms}</strong></p>
                    
                    <h3 style={{color: '#0f172a', margin: '1.5rem 0 0.5rem', fontSize: '1rem'}}>3. Scope & Validity</h3>
                    <p>This contract remains valid for the duration of the onboarding period and serves as the legal baseline for subsequent service deliveries.</p>
                </div>
             </div>
        </div>

        {/* RIGHT: Onboarding & Tracker Pane */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem'}}>
            
            {/* Onboarding Tracker Cards */}
            <div className="glass-panel" style={{padding: '1.5rem'}}>
                <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><ClipboardList size={18}/> Onboarding Requirements</h3>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'}}>
                    <div style={{padding: '0.75rem', background: data.onboarding_status.company_info ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem'}}>
                        {data.onboarding_status.company_info ? <CheckCircle2 size={16} color="var(--accent)"/> : <Clock size={16} opacity={0.5}/>} Company Info
                    </div>
                    <div style={{padding: '0.75rem', background: data.onboarding_status.contacts ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem'}}>
                        {data.onboarding_status.contacts ? <CheckCircle2 size={16} color="var(--accent)"/> : <Clock size={16} opacity={0.5}/>} Billing Contacts
                    </div>
                    <div style={{padding: '0.75rem', background: data.onboarding_status.tax_info ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem'}}>
                        {data.onboarding_status.tax_info ? <CheckCircle2 size={16} color="var(--accent)"/> : <Clock size={16} opacity={0.5}/>} Tax Details (GST)
                    </div>
                    <div style={{padding: '0.75rem', background: data.onboarding_status.documents ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem'}}>
                        {data.onboarding_status.documents ? <CheckCircle2 size={16} color="var(--accent)"/> : <Clock size={16} opacity={0.5}/>} Documents Uploaded
                    </div>
                </div>
            </div>

            {/* Visual Audit Lifecycle Timeline */}
            <AuditTimeline contractId={contract_id} accessToken={accessToken} refreshTrigger={refreshAudit} />

            {/* Forms Section */}
            <div className="glass-panel" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div style={{opacity: isSigned ? 0.6 : 1, pointerEvents: isSigned ? 'none' : 'auto'}}>
                    <h4 style={{marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem'}}>Legal Entity Details</h4>
                    <div className="form-group">
                        <label className="form-label">Legal Company Name</label>
                        <input name="legal_name" value={onboarding.legal_name} onChange={handleInputChange} className="form-control" placeholder="Acme Corp Pvt Ltd" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Registered Address</label>
                        <textarea name="address" value={onboarding.address} onChange={handleInputChange} className="form-control" rows="2" placeholder="Full billing address..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">GST Number</label>
                        <input name="gst" value={onboarding.gst} onChange={handleInputChange} className="form-control" placeholder="27AAAAA0000A1Z5" />
                    </div>

                    <h4 style={{marginTop: '2rem', marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem'}}>Required Documents</h4>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        <FileUploader 
                            label="GST Registration Certificate" 
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

                {/* Bottom Action Footer (Inside Scroll Pane) */}
                <div style={{marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--surface-border)'}}>
                    {!isSigned ? (
                        <button 
                            className="btn btn-success" 
                            style={{width: '100%', padding: '1.25rem', fontSize: '1.1rem'}}
                            disabled={!data.onboarding_status.company_info || !data.onboarding_status.tax_info}
                            onClick={handleSign}
                        >
                            <PenTool size={22}/> Confirm & Sign Contract
                        </button>
                    ) : (
                        <div style={{textAlign: 'center', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)'}}>
                            <CheckCircle2 size={32} color="var(--accent)" style={{marginBottom: '0.5rem'}}/>
                            <h4 style={{margin:0}}>Contract Fully Executed</h4>
                            <p style={{fontSize: '0.8rem', margin: '0.25rem 0 0'}}>Signed on {new Date(data.signed_at).toLocaleString()}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for File Uploads
const FileUploader = ({ label, field, url, onUpload, uploading }) => (
    <div style={{padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--surface-border)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
                <span style={{fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem'}}>{label}</span>
                {url ? (
                    <a href={url} target="_blank" rel="noreferrer" style={{fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none'}}>
                         <ExternalLink size={12}/> View Uploaded File
                    </a>
                ) : (
                    <span style={{fontSize: '0.75rem', opacity: 0.5}}>No file selected</span>
                )}
            </div>
            
            <label className="btn btn-ghost" style={{padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)'}}>
                {uploading ? <Loader2 size={16} className="spinner"/> : <><Upload size={16}/> {url ? 'Replace' : 'Upload'}</>}
                <input type="file" onChange={(e) => onUpload(e, field)} style={{display: 'none'}} disabled={uploading}/>
            </label>
        </div>
    </div>
);
