import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, ChevronRight, Search, Filter, ArrowRight, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Dashboard() {
  const { accessToken, user } = useAuth();
  const { profile } = useProfile();
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
        <h1 style={{ fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>Workspace Dashboard</h1>
        <p style={{ fontSize: '1.05rem', color: '#64748B' }}>Review and manage your organization's secure agreements.</p>
      </div>

      {/* 🔥 URGENT: Changes Requested Alert */}
      {profile && profile.review_status === "changes_requested" && (
        <div style={{
          background: '#FFF7ED',
          border: '2px solid #FB923C',
          borderRadius: '24px',
          padding: '2.5rem',
          marginBottom: '3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 15px -3px rgba(251, 146, 60, 0.1)',
          animation: 'pulse 2s infinite ease-in-out'
        }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '16px', background: '#FFEDD5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C',
              shrink: 0
            }}>
              <RefreshCcw size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#9A3412', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                Action Required: Correction Needed
              </h2>
              <p style={{ fontSize: '1rem', color: '#C2410C', fontWeight: 600, maxWidth: '600px', margin: 0, lineHeight: 1.5 }}>
                 The admin has requested changes to your profile: 
                 <span style={{ display: 'block', marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'white', borderRadius: '10px', fontStyle: 'italic', fontWeight: 500, color: '#475569', border: '1px solid #FED7AA' }}>
                   "{profile.review_notes || "Please review your submitted data and documents for accuracy."}"
                 </span>
              </p>
            </div>
          </div>
          <button 
            className="btn"
            onClick={() => navigate('/onboarding/form')}
            style={{
              background: '#EA580C',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.2)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = '#C2410C';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = '#EA580C';
            }}
          >
            Update Profile <ArrowRight size={20} />
          </button>
        </div>
      )}

      {user?.pending_onboarding && profile?.review_status !== "changes_requested" && (
        <div style={{
          background: 'linear-gradient(135deg, #033F99 0%, #1E40AF 100%)',
          borderRadius: '24px',
          padding: '2.5rem',
          color: 'white',
          marginBottom: '3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 20px 25px -5px rgba(30, 64, 175, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative element */}
          <div style={{
            position: 'absolute',
            right: '-10%',
            top: '-20%',
            width: '300px',
            height: '300px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              Finalize Your Setup
            </h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: 0, maxWidth: '500px', fontWeight: 500 }}>
              Complete your organization's legal and tax profile to unlock your pending contracts and secure workspace modules.
            </p>
          </div>

          <button 
            className="btn"
            onClick={() => navigate('/onboarding/form')}
            style={{
              background: 'white',
              color: '#033F99',
              padding: '1rem 2rem',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s ease',
              position: 'relative',
              zIndex: 1
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Finish Onboarding <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* Profile Completion Warning */}
      {profile && profile.overall_completion < 100 && (
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FEF3C7',
          borderRadius: '18px',
          padding: '1.25rem 2rem',
          marginBottom: '3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '10px', background: '#FEF3C7', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' 
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#92400E', fontWeight: 700, fontSize: '1rem' }}>Your company details are incomplete</h4>
              <p style={{ margin: 0, color: '#B45309', fontSize: '0.9rem', fontWeight: 500 }}>Please complete your profile to ensure seamless contract processing.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/details')}
            style={{
              background: '#D97706',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#B45309'}
            onMouseOut={(e) => e.currentTarget.style.background = '#D97706'}
          >
            Complete Now
          </button>
        </div>
      )}

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
