import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, ChevronRight, Search, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Dashboard() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/contracts`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const json = await res.json();
      if (json.success) {
        setContracts(json.contracts);
      }
    } catch (err) {
      console.error("Failed to fetch contracts", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'SENT': { bg: '#E0EEFF', color: '#033F99', icon: <Clock size={14} />, label: 'Pending Review' },
      'SIGNED': { bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={14} />, label: 'Signed' },
      'DRAFT': { bg: '#F1F5F9', color: '#475569', icon: <FileText size={14} />, label: 'Draft' }
    };
    const s = statusMap[status] || statusMap['DRAFT'];
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        padding: '6px 14px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 700,
        background: s.bg, color: s.color
      }}>
        {s.icon} <span>{s.label}</span>
      </div>
    );
  };

  const filteredContracts = contracts.filter(c =>
    c.contract_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: '#033F99' }} />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease forwards' }}>
      <div style={{ marginBottom: '3.5rem' }}>
        <h1 style={{ fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>My Contracts</h1>
        <p style={{ fontSize: '1.05rem', color: '#64748B' }}>Review and manage your organization's secure agreements.</p>
      </div>

      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '3rem',
        padding: '1.25rem', background: 'white', borderRadius: '18px',
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search contracts..."
            className="form-control"
            style={{ 
              paddingLeft: '3rem', 
              marginBottom: 0, 
              background: '#F8FAFC',
              border: '1px solid #E5E7EB',
              height: '48px'
            }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn" style={{ 
          display: 'inline-flex', gap: '0.5rem', alignItems: 'center',
          background: 'white', border: '1px solid #E5E7EB', color: '#475569',
          height: '48px', padding: '0 1.25rem'
        }}>
          <Filter size={18} /> <span>Filters</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '2rem' }}>
        {filteredContracts.length > 0 ? filteredContracts.map(c => (
          <div
            key={c.contract_id}
            className="dashboard-card"
            onClick={() => navigate(`/contracts/${c.contract_id}`)}
            style={{
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              gap: '1.25rem', animation: 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', background: '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#033F99'
              }}>
                <FileText size={22} />
              </div>
              {getStatusBadge(c.status)}
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem', color: '#111827' }}>
                {c.contract_id}
              </h3>
              <p style={{ fontSize: '0.9rem', marginBottom: 0, fontWeight: 500, color: '#64748B' }}>
                {c.organization_name}
              </p>
            </div>

            <div style={{
              marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: '1.25rem', borderTop: '1px solid #F1F5F9'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Clock size={14} /> {new Date(c.created_at).toLocaleDateString()}
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#033F99', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Open Contract <ChevronRight size={18} />
              </span>
            </div>
          </div>
        )) : (
          <div className="dashboard-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 2rem', background: 'white' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: '#F8FAFC', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' 
            }}>
              <FileText size={40} style={{ color: '#CBD5E1' }} />
            </div>
            <h3 style={{ color: '#111827', fontWeight: 700 }}>No contracts found</h3>
            <p style={{ color: '#64748B' }}>We couldn't find any contracts matching your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
