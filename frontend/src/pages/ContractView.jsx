import React, { useContext } from 'react';
import { PortalContext } from './PortalGuard.jsx';
import { Download, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContractView() {
  const { data } = useContext(PortalContext);
  const navigate = useNavigate();
  const contract = data?.contract || {};
  const lead = data?.lead || {};

  return (
    <div className="glass-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <div>
          <h2 style={{margin: 0}}>Contract Review</h2>
          <p style={{margin: 0}}>Please review the commercial terms below.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <Download size={18} /> Download Draft
        </button>
      </div>

      <div className="contract-preview">
        <div className="contract-header">
          <div>
            <h1 className="contract-title">Software Service Agreement</h1>
            <p style={{color: '#64748b', fontSize: '1rem'}}>{contract.contract_id || 'DRAFT'}</p>
          </div>
          <div style={{textAlign: 'right'}}>
            <p style={{fontWeight: 600, color: '#0f172a'}}>Prepared for:</p>
            <p>{contract.party_name || lead.company_name}</p>
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div style={{marginBottom: '2rem'}}>
          <h3 style={{color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem'}}>1. Commercial Terms</h3>
          <p style={{color: '#475569'}}>Total Value: <strong>₹{contract.total_value?.toLocaleString() || lead.expected_deal_value?.toLocaleString() || '1,00,000'}</strong></p>
          <p style={{color: '#475569'}}>Payment Terms: <strong>{contract.payment_terms || 'Net 30'}</strong></p>
          
          <table style={{width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse'}}>
             <thead>
               <tr style={{borderBottom: '2px solid #cbd5e1', textAlign: 'left'}}>
                 <th style={{padding: '0.75rem'}}>Item</th>
                 <th style={{padding: '0.75rem'}}>Quantity</th>
                 <th style={{padding: '0.75rem'}}>Price</th>
               </tr>
             </thead>
             <tbody>
               {lead.items?.map((item, i) => (
                 <tr key={i} style={{borderBottom: '1px solid #e2e8f0'}}>
                   <td style={{padding: '0.75rem', color: '#334155'}}>{item.item_name || 'Standard License'}</td>
                   <td style={{padding: '0.75rem', color: '#334155'}}>{item.quantity || 1}</td>
                   <td style={{padding: '0.75rem', color: '#334155'}}>₹{item.total_price?.toLocaleString() || contract.total_value?.toLocaleString()}</td>
                 </tr>
               ))}
               {!lead.items && (
                 <tr style={{borderBottom: '1px solid #e2e8f0'}}>
                   <td style={{padding: '0.75rem', color: '#334155'}}>Enterprise Software License</td>
                   <td style={{padding: '0.75rem', color: '#334155'}}>1</td>
                   <td style={{padding: '0.75rem', color: '#334155'}}>₹{contract.total_value?.toLocaleString()}</td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
        
        <div style={{marginBottom: '2rem'}}>
          <h3 style={{color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem'}}>2. Legal Clauses</h3>
          <p style={{color: '#475569', fontSize: '0.9rem', lineHeight: 1.8}}>
            {contract.legal_clauses || "Standard terms apply regarding confidentiality, usage, and termination. Any disputes shall be subject to standard arbitration clauses defined under this domain."}
          </p>
        </div>
      </div>
      
      <div style={{marginTop: '3rem', display: 'flex', justifyContent: 'flex-end'}}>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/portal/onboarding')}
        >
          Acknowledge & Continue <CheckCircle2 size={18} />
        </button>
      </div>
    </div>
  );
}
