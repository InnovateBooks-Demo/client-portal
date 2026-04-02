import React, { useContext, useState } from 'react';
import { PortalContext } from './PortalGuard.jsx';
import { PenTool, CheckCircle2, AlertCircle, ShieldCheck, User, Mail, Landmark, Phone } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SignPage() {
  const { data, token, refreshData, accessToken } = useContext(PortalContext);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gst_number: '',
    phone: ''
  });
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const contract = data?.contract || {};

  const isFormValid = formData.name.trim() && 
                      formData.email.includes('@') && 
                      formData.gst_number.trim() && 
                      formData.phone.trim() && 
                      agreed;

  const handleSign = async () => {
    if (!isFormValid) return;
    setSigning(true);
    setError(null);
    try {
      // Capture basic client identity metadata
      const payload = {
        ...formData,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(`${API_BASE}/api/client-portal/${token}/sign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
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
      <div className="bg-white border border-[#D9E4F2] rounded-3xl p-16 text-center shadow-sm animate-in zoom-in-95 duration-500">
        <div className="inline-block p-6 bg-[#EAF2FF] rounded-2xl text-[#22C55E] mb-8 border border-[#D9E4F2]">
          <CheckCircle2 size={64} />
        </div>
        <h2 className="text-3xl font-black text-[#0B1F4D] mb-4 uppercase tracking-tight">Contract Execution Success</h2>
        <p className="text-[#3E5C8A] font-medium text-lg max-w-lg mx-auto leading-relaxed">
          The agreement is now legally binding. A certified copy with the audit trail has been generated and archived.
        </p>
        <div className="mt-12 p-4 bg-[#F4F8FF] rounded-xl border border-[#D9E4F2] inline-flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#0F5FFF]" />
          <span className="text-[11px] font-black text-[#0F5FFF] uppercase tracking-widest">Digital Fingerprint Captured</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#D9E4F2] rounded-3xl overflow-hidden shadow-sm font-inter">
      <div className="px-10 py-8 border-b border-[#D9E4F2] bg-[#F4F8FF]/50">
        <h2 className="text-2xl font-black text-[#0B1F4D] uppercase tracking-tight">Accept & Sign</h2>
        <p className="text-[#3E5C8A] font-medium mt-1">Review the final document summary and verify your identity.</p>
      </div>

      <div className="p-10 space-y-10">
        {/* Mandatory Identity Form */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-[#3E5C8A] uppercase tracking-[0.2em] flex items-center gap-2">
            <User className="h-4 w-4" /> Signatory Identity Verification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#3E5C8A] uppercase tracking-widest">Full Name (Authorized)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-12 pl-10 pr-4 bg-[#F4F8FF] border border-[#D9E4F2] rounded-xl focus:outline-none focus:border-[#0F5FFF] transition-all font-medium text-[#0B1F4D]"
                  placeholder="e.g. Rahul Sharma"
                />
                <User className="absolute left-3 top-3.5 h-5 w-5 text-[#3E5C8A]/50" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#3E5C8A] uppercase tracking-widest">Operational Email</label>
              <div className="relative">
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full h-12 pl-10 pr-4 bg-[#F4F8FF] border border-[#D9E4F2] rounded-xl focus:outline-none focus:border-[#0F5FFF] transition-all font-medium text-[#0B1F4D]"
                  placeholder="e.g. rahul@company.com"
                />
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#3E5C8A]/50" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#3E5C8A] uppercase tracking-widest">GSTIN / Tax Identifier</label>
              <div className="relative">
                <input 
                  type="text"
                  value={formData.gst_number}
                  onChange={e => setFormData({...formData, gst_number: e.target.value})}
                  className="w-full h-12 pl-10 pr-4 bg-[#F4F8FF] border border-[#D9E4F2] rounded-xl focus:outline-none focus:border-[#0F5FFF] transition-all font-medium text-[#0B1F4D]"
                  placeholder="27AAAAA0000A1Z5"
                />
                <Landmark className="absolute left-3 top-3.5 h-5 w-5 text-[#3E5C8A]/50" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#3E5C8A] uppercase tracking-widest">Contact Phone</label>
              <div className="relative">
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full h-12 pl-10 pr-4 bg-[#F4F8FF] border border-[#D9E4F2] rounded-xl focus:outline-none focus:border-[#0F5FFF] transition-all font-medium text-[#0B1F4D]"
                  placeholder="+91 98765 43210"
                />
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-[#3E5C8A]/50" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-[#EAF2FF]/30 border border-[#D9E4F2] rounded-2xl">
          <h3 className="text-[14px] font-bold text-[#0B1F4D] mb-4">Execution Protocol</h3>
          <p className="text-[13px] leading-relaxed text-[#3E5C8A] font-medium">
            By executing this Agreement, you signify that you have read, understood, and accept our <span className="font-bold text-[#0F5FFF]">{contract.payment_terms || 'Net 30'}</span> terms and the standard terms of service. You represent and warrant that you possess the legal authority to bind your organization to these terms.
          </p>
          
          <label className="mt-8 flex items-start gap-4 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)} 
              className="mt-1 w-5 h-5 rounded border-[#D9E4F2] text-[#0F5FFF] focus:ring-[#0F5FFF]"
            />
            <span className="text-[13px] font-bold text-[#0B1F4D] select-none group-hover:text-[#0F5FFF] transition-colors leading-tight">
              I agree to the terms listed above and affix my electronic signature with the provided identity data.
            </span>
          </label>
        </div>

        {error && (
          <div className="p-4 bg-[#F4F8FF] border border-[#0F5FFF] rounded-xl flex items-center gap-3 text-[#0F5FFF] text-sm font-bold">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {!isFormValid && !agreed && (
          <div className="text-center">
             <p className="text-[11px] font-black text-[#0F5FFF] uppercase tracking-widest bg-[#EAF2FF] inline-block px-4 py-2 rounded-full border border-[#D9E4F2]">
                Complete all required details before signing
             </p>
          </div>
        )}

        <div className="pt-8 border-t border-[#D9E4F2] flex justify-end">
          <button 
            onClick={handleSign}
            disabled={!isFormValid || signing}
            className={`px-10 py-4 rounded-xl text-white font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg ${
              isFormValid ? 'bg-[#0F5FFF] hover:bg-[#0D4FCC] shadow-[#0F5FFF]/20' : 'bg-[#D9E4F2] text-[#3E5C8A] opacity-50 cursor-not-allowed shadow-none'
            }`}
          >
            {signing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><PenTool size={20} /> ACCEPT & SIGN</>}
          </button>
        </div>
      </div>
    </div>
  );
}
