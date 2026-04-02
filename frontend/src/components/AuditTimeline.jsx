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
    <div className="timeline-items" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {timeline.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No activity recorded yet.</p>}
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
                width: '1px',
                background: '#E2E8F0'
              }} />
            )}

            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              zIndex: 1
            }}>
              <Icon size={12} style={{ color: '#033F99' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{config.label}</span>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {item.metadata?.filename && (
                 <div style={{ fontSize: '0.75rem', color: '#033F99', marginTop: '2px', fontWeight: 600 }}>
                   {item.metadata.filename}
                 </div>
              )}
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
                {new Date(item.timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
