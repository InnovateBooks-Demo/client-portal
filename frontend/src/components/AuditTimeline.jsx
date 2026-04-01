import React, { useState, useEffect } from 'react';
import { 
  Send, Eye, LogIn, Edit3, Upload, PenTool, 
  Bell, AlertTriangle, CheckCircle2, Circle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const EVENT_ICONS = {
  contract_sent: { icon: Send, color: '#3b82f6', label: 'Contract Sent' },
  portal_opened: { icon: Eye, color: '#6366f1', label: 'Portal Opened' },
  login_success: { icon: LogIn, color: '#8b5cf6', label: 'Client Logged In' },
  onboarding_started: { icon: Edit3, color: '#f59e0b', label: 'Onboarding Started' },
  onboarding_completed: { icon: CheckCircle2, color: '#10b981', label: 'Onboarding Completed' },
  document_uploaded: { icon: Upload, color: '#06b6d4', label: 'Document Uploaded' },
  contract_signed: { icon: PenTool, color: '#10b981', label: 'Contract Signed' },
  reminder_sent: { icon: Bell, color: '#f43f5e', label: 'Reminder Sent' },
  contract_expired: { icon: AlertTriangle, color: '#e11d48', label: 'Contract Expired' }
};

export default function AuditTimeline({ contractId, accessToken, refreshTrigger }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/client-portal/audit/${contractId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const json = await res.json();
        if (json.success) {
          setTimeline(json.timeline);
        }
      } catch (err) {
        console.error("Failed to fetch audit timeline", err);
      } finally {
        setLoading(false);
      }
    };

    if (contractId) fetchTimeline();
  }, [contractId, accessToken, refreshTrigger]);

  if (loading) return null;

  return (
    <div className="audit-timeline-container" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      padding: '1.5rem',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--surface-border)'
    }}>
      <h3 style={{fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        <Circle size={12} fill="var(--primary)"/> Activity History
      </h3>

      <div className="timeline-items" style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
        {timeline.length === 0 && <p style={{fontSize: '0.8rem', opacity: 0.5}}>No activity recorded yet.</p>}
        {timeline.map((item, idx) => {
          const config = EVENT_ICONS[item.event] || { icon: Circle, color: '#94a3b8', label: item.event };
          const Icon = config.icon;
          
          return (
            <div key={idx} className="timeline-item" style={{
              display: 'flex',
              gap: '1rem',
              position: 'relative',
              paddingBottom: idx === timeline.length - 1 ? 0 : '0.75rem'
            }}>
              {/* Vertical Connector Line */}
              {idx !== timeline.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '11px',
                  top: '24px',
                  bottom: '0',
                  width: '2px',
                  background: 'var(--surface-border)',
                  opacity: 0.3
                }} />
              )}

              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: `${config.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1
              }}>
                <Icon size={14} style={{color: config.color}} />
              </div>

              <div style={{flex: 1}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontSize: '0.85rem', fontWeight: 500}}>{config.label}</span>
                  <span style={{fontSize: '0.7rem', opacity: 0.5}}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {item.metadata?.filename && (
                   <div style={{fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px'}}>
                     {item.metadata.filename}
                   </div>
                )}
                <div style={{fontSize: '0.7rem', opacity: 0.4, marginTop: '2px'}}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
