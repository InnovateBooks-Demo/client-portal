import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Clock, Download, Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export default function ContractView() {
  const { contract_id } = useParams();
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [signing, setSigning] = useState(false);

  // Extract token from URL (Client Portal Link)
  const queryToken = new URLSearchParams(window.location.search).get("token");
  const effectiveToken = queryToken || accessToken;

  const fetchContract = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/contracts/${contract_id}`, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`
        }
      });

      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (effectiveToken && contract_id) {
      fetchContract();
    }
  }, [contract_id, effectiveToken]);

  const handleSign = async () => {
    if (!contract_id || !effectiveToken) {
      toast.error("Invalid access session");
      return;
    }

    setSigning(true);
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/contracts/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveToken}`
        },
        body: JSON.stringify({ 
          contract_id,
          token: queryToken // Explicitly send token in body if present
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Agreement signed successfully!");
        // Refresh data to update status to 'signed' and hide button
        await fetchContract();
      } else {
        toast.error(json.detail || "Failed to sign contract");
      }
    } catch (err) {
      toast.error("Network error during signing");
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadPDF = async () => {
    const tid = toast.loading("Generating PDF...");
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/contracts/${contract_id}/pdf`, {
        headers: { Authorization: `Bearer ${effectiveToken}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract_${contract_id}.pdf`;
        a.click();
        toast.success("Downloaded successfully", { id: tid });
      } else {
        toast.error("Failed to generate PDF", { id: tid });
      }
    } catch (err) {
      toast.error("Download error", { id: tid });
    }
  };

  if (!data) return <div style={{ padding: '20px', color: '#64748b' }}>Loading...</div>;

  const contract = data?.contract;
  const html = contract?.generated_content || "";
  const status = contract?.status; 

  console.log("Contract Data:", contract);

  if (!html) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>
        Contract not generated yet
      </div>
    );
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", position: 'relative' }}>
      {/* Action Bar */}
      <div style={{ 
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)',
        padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Contract Agreement</h2>
          <span style={{ 
            fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
            background: status === 'signed' ? '#dcfce7' : '#f1f5f9',
            color: status === 'signed' ? '#166534' : '#475569'
          }}>
            {status?.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {status === 'sent' && (
            <button
              onClick={handleSign}
              disabled={signing}
              style={{
                background: "#033F99", color: "white", padding: "10px 24px",
                borderRadius: "10px", fontWeight: 700, border: "none",
                cursor: signing ? "not-allowed" : "pointer",
                display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}
            >
              {signing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {signing ? "Signing..." : "Sign Agreement"}
            </button>
          )}

          {status === 'signed' && (
            <button
              onClick={handleDownloadPDF}
              style={{
                background: "#065F46", color: "white", padding: "10px 24px",
                borderRadius: "10px", fontWeight: 700, border: "none",
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}
            >
              <Download size={18} /> Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Contract Content */}
      <div style={{ maxWidth: '900px', margin: '40px auto', background: "#fff", padding: "60px", boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', borderRadius: '16px' }}>
        <div style={{ color: "#000", fontSize: '1.1rem', lineHeight: 1.6 }}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
