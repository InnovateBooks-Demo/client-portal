import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ContractView() {
  const { contract_id } = useParams();
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/client-portal/contracts/${contract_id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        const json = await res.json();
        
        // Step 1: Log API response
        console.log("DATA RECEIVED:", json);
        
        if (json.success) {
          setData(json);
          // Step 2: Log HTML
          console.log("HTML CONTENT:", json?.contract?.generated_content);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    if (accessToken && contract_id) {
      fetchContract();
    }
  }, [contract_id, accessToken]);

  if (!data) return <div style={{ padding: '20px', color: '#64748b' }}>Loading...</div>;

  // Step 3: Ensure correct path
  const html = data?.contract?.generated_content || "";

  // Add fallback for missing generated content
  if (!html) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>
        Contract not generated yet
      </div>
    );
  }

  // Step 4 & 5: Render ONLY this with visible styles
  // Step 7: Do NOT wrap inside other containers
  return (
    <div style={{ background: "#fff", padding: "40px", minHeight: "100vh" }}>
      <div style={{ color: "#000" }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
