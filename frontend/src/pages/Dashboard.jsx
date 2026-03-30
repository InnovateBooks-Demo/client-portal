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
      'SENT': { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa', icon: <Clock size={14}/>, label: 'Pending Review' },
      'SIGNED': { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.4)', color: '#34d399', icon: <CheckCircle2 size={14}/>, label: 'Signed' },
      'DRAFT': { bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.4)', color: '#94a3b8', icon: <FileText size={14}/>, label: 'Draft' }
    };
    const s = statusMap[status] || statusMap['DRAFT'];
    return (
      <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
          padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
          background: s.bg, border: `1px solid ${s.border}`, color: s.color
      }}>
        {s.icon} {s.label}
      </div>
    );
  };

  const filteredContracts = contracts.filter(c => 
    c.contract_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px'}}>
             <div className="spinner" style={{width: '30px', height: '30px'}} />
        </div>
    );
  }

  return (
    <div style={{animation: 'fadeIn 0.5s ease forwards'}}>
      <div style={{marginBottom: '2.5rem'}}>
        <h1>My Contracts</h1>
        <p>Review, populate, and sign your organization's secure agreements.</p>
      </div>

      <div style={{
          display: 'flex', gap: '1rem', marginBottom: '2rem',
          padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--surface-border)'
      }}>
        <div style={{position: 'relative', flex: 1}}>
          <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
          <input 
            type="text" 
            placeholder="Search contracts..." 
            className="form-control" 
            style={{paddingLeft: '2.5rem', marginBottom: 0}}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" style={{display: 'inline-flex', gap: '0.5rem', alignItems: 'center'}}>
          <Filter size={18}/> Filters
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem'}}>
        {filteredContracts.length > 0 ? filteredContracts.map(c => (
          <div 
            key={c.contract_id} 
            className="glass-panel" 
            onClick={() => navigate(`/contracts/${c.contract_id}`)}
            style={{
                cursor: 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', 
                gap: '1rem', animation: 'none', transform: 'none'
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                }}>
                    <FileText size={24} />
                </div>
                {getStatusBadge(c.status)}
            </div>

            <div>
                <h3 style={{marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {c.contract_id}
                </h3>
                <p style={{fontSize: '0.85rem', marginBottom: 0, fontWeight: 500, color: 'var(--text-main)'}}>
                    {c.organization_name}
                </p>
            </div>

            <div style={{
                marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', opacity: 0.8
            }}>
                <span style={{fontSize: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center'}}><Clock size={14}/> {new Date(c.created_at).toLocaleDateString()}</span>
                <span style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center'}}>
                    Open Contract <ChevronRight size={16} />
                </span>
            </div>
          </div>
        )) : (
            <div className="glass-panel" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem'}}>
                <FileText size={48} style={{margin: '0 auto 1rem', opacity: 0.3}} />
                <h3>No contracts found</h3>
                <p>We couldn't find any contracts matching your permissions or search criteria.</p>
            </div>
        )}
      </div>
    </div>
  );
}
