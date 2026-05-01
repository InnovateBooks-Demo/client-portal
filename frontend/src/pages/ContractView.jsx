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

  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signatureText, setSignatureText] = useState("");

  const handleSign = async () => {
    if (!contract_id || !effectiveToken) {
      toast.error("Invalid access session");
      return;
    }

    if (!signerName.trim() || !signatureText.trim()) {
      toast.error("Full Name and Signature are required");
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
          signer_name: signerName,
          signature_text: signatureText
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Agreement signed successfully!");
        setShowSignModal(false);
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
  const status = contract?.status;
  const html = contract?.generated_content || "";

  const hydrateContractSignature = (html, contract) => {
    if (!html || !contract || contract.status !== 'signed') return html;
    
    const { signer_name, signature_text, signed_at } = contract;
    if (!signer_name && !signature_text && !signed_at) return html;

    const signedDate = signed_at ? new Date(signed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : "";

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const sigTextEl = doc.getElementById('client-signature-text');
      const signerNameEl = doc.getElementById('client-signer-name');
      const signedDateEl = doc.getElementById('client-signed-date');

      // --- CASE A: MODERN TEMPLATE (IDs PRESENT) ---
      if (sigTextEl || signerNameEl || signedDateEl) {
        if (sigTextEl && signature_text) {
          sigTextEl.textContent = signature_text;
          sigTextEl.style.fontFamily = "'Dancing Script', cursive";
          sigTextEl.style.fontSize = "22pt";
          sigTextEl.style.color = "#033F99";
          sigTextEl.style.marginBottom = "-12px";
          sigTextEl.style.transform = "rotate(-2deg)";
        }
        if (signerNameEl && signer_name) signerNameEl.textContent = signer_name;
        if (signedDateEl && signedDate) signedDateEl.textContent = `Date: ${signedDate}`;

        // Inject Font if not present in the doc
        if (!html.includes('Dancing+Script')) {
          const style = doc.createElement('style');
          style.textContent = "@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');";
          doc.head.appendChild(style);
        }
        return doc.documentElement.innerHTML;
      }

      // --- CASE B: LEGACY TEMPLATE (NO IDs) ---
      // Fallback: Structural replacement on the SECOND sig-line block
      let hydratedHtml = html;
      const parts = hydratedHtml.split('<div class="sig-line">');
      
      if (parts.length >= 3) {
        let clientBlock = parts[2];
        
        if (signature_text) {
          const sigTextHtml = `<div style="font-family:'Dancing Script', cursive; font-size:22pt; color:#033F99; margin-bottom:-12px; transform:rotate(-2deg);">${signature_text}</div>`;
          clientBlock = clientBlock.replace("Authorised Signatory", `${sigTextHtml}Authorised Signatory`);
        }
        
        if (signer_name) {
          clientBlock = clientBlock.replace("Name &amp; Designation", signer_name);
          clientBlock = clientBlock.replace("Name & Designation", signer_name);
        }
        
        if (signedDate) {
          clientBlock = clientBlock.replace("____________________", signedDate);
          clientBlock = clientBlock.replace("Date: ", `Date: ${signedDate}`);
        }
        
        parts[2] = clientBlock;
        hydratedHtml = parts.join('<div class="sig-line">');
        
        if (!hydratedHtml.includes('Dancing+Script')) {
          hydratedHtml = `<style>@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');</style>${hydratedHtml}`;
        }
        return hydratedHtml;
      }

      return html;
    } catch (err) {
      console.error("[Hydration Error] Fallback failed:", err);
      return html;
    }
  };

  const hydratedHtml = hydrateContractSignature(html, contract);

  console.log("[Render] Passing to dangerouslySetInnerHTML:", { 
    isHydrated: hydratedHtml !== html,
    htmlLength: hydratedHtml.length 
  });

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
              onClick={() => setShowSignModal(true)}
              style={{
                background: "#033F99", color: "white", padding: "10px 24px",
                borderRadius: "10px", fontWeight: 700, border: "none",
                cursor: "pointer",
                display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}
            >
              <CheckCircle2 size={18} />
              Sign Agreement
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

      {/* Signing Modal */}
      {showSignModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyCenter: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white', maxWidth: '450px', width: '100%',
            borderRadius: '24px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            margin: '0 auto'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', textAlign: 'center' }}>Sign Agreement</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', marginBottom: '32px' }}>
              Please enter your full name and type your signature to execute this agreement.
            </p>

            <div style={{ spaceY: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Full Name</label>
                <input 
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid #e2e8f0',
                    outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Signature (Type Name)</label>
                <input 
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Type your name here"
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid #e2e8f0',
                    outline: 'none', fontSize: '1.1rem', fontWeight: 600, fontStyle: 'italic'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={() => setShowSignModal(false)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0',
                    background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                    background: '#033F99', color: 'white', fontWeight: 700, cursor: signing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  {signing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {signing ? "Signing..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Content */}
      <div style={{ maxWidth: '900px', margin: '40px auto', background: "#fff", padding: "60px", boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', borderRadius: '16px' }}>
        <div style={{ color: "#000", fontSize: '1.1rem', lineHeight: 1.6 }}>
          <div dangerouslySetInnerHTML={{ __html: hydratedHtml }} />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
      `}</style>
    </div>
  );
}
