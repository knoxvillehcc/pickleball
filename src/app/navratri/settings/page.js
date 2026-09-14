'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';

const T = (theme) => ({
  card: theme === 'dark' ? '#1e293b' : '#FFFFFF',
  border: theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
  text: theme === 'dark' ? '#F8FAFC' : '#0f172a', muted: theme === 'dark' ? '#94A3B8' : '#64748B',
  primary: '#FF6B35', green: '#34D399', red: '#EF4444', accent: '#FFD700',
});

export default function SettingsPage() {
  const { theme } = useTheme();
  const t = T(theme);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/navratri/events');
        const data = await res.json();
        if (data.events?.length) setEvent(data.events[0]);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  const updateField = (key, val) => setEvent(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!event) return;
    setSaving(true); setMessage(null);
    try {
      const res = await fetch(`/api/navratri/events/${event.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved!' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Change event status to "${newStatus}"?`)) return;
    setSaving(true); setMessage(null);
    try {
      const res = await fetch(`/api/navratri/events/${event.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setEvent(data.event);
        setMessage({ type: 'success', text: `Status changed to ${newStatus}` });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: '40px', color: t.muted }}>Loading...</div>;
  if (!event) return <div style={{ padding: '40px', color: t.red }}>No event found. Create one first.</div>;

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: t.muted, marginBottom: '6px' };
  const sectionStyle = { background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', marginBottom: '20px' };
  const toggleStyle = (on) => ({
    padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
    background: on ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.1)',
    color: on ? t.green : t.red,
  });

  return (
    <div style={{ padding: '24px 28px', color: t.text, maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>⚙️ Event Settings</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/navratri" style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${t.border}`, color: t.text, textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>← Dashboard</a>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: t.primary, color: 'white', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '16px',
          background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
          color: message.type === 'error' ? t.red : t.green, fontSize: '14px',
        }}>{message.type === 'error' ? '❌' : '✅'} {message.text}</div>
      )}

      {/* Status */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>📊 Event Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', textTransform: 'capitalize' }}>Current: {event.status}</span>
          {event.status === 'draft' && <button onClick={() => handleStatusChange('published')} style={{ ...toggleStyle(true) }}>Publish</button>}
          {event.status === 'published' && <button onClick={() => handleStatusChange('active')} style={{ ...toggleStyle(true) }}>Activate</button>}
          {event.status === 'active' && <button onClick={() => handleStatusChange('completed')} style={{ ...toggleStyle(false) }}>Complete</button>}
        </div>
      </div>

      {/* Sales Toggles */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>🛒 Sales Controls</h3>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <span style={{ ...labelStyle }}>Daily Ticket Sales</span>
            <button onClick={() => updateField('daily_sales_open', !event.daily_sales_open)} style={toggleStyle(event.daily_sales_open)}>
              {event.daily_sales_open ? '✅ Open' : '❌ Closed'}
            </button>
          </div>
          <div>
            <span style={{ ...labelStyle }}>Combo Pass Sales</span>
            <button onClick={() => updateField('combo_sales_open', !event.combo_sales_open)} style={toggleStyle(event.combo_sales_open)}>
              {event.combo_sales_open ? '✅ Open' : '❌ Closed'}
            </button>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>💰 Pricing</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><label style={labelStyle}>General Daily ($)</label><input style={inputStyle} type="number" step="0.01" value={((event.price_general_daily || 0) / 100).toFixed(2)} onChange={e => updateField('price_general_daily', Math.round(parseFloat(e.target.value) * 100))} /></div>
          <div><label style={labelStyle}>Pioneer Guest Daily ($)</label><input style={inputStyle} type="number" step="0.01" value={((event.price_pioneer_guest_daily || 0) / 100).toFixed(2)} onChange={e => updateField('price_pioneer_guest_daily', Math.round(parseFloat(e.target.value) * 100))} /></div>
          <div><label style={labelStyle}>Non-Member Daily ($)</label><input style={inputStyle} type="number" step="0.01" value={((event.price_nonmember_daily || 0) / 100).toFixed(2)} onChange={e => updateField('price_nonmember_daily', Math.round(parseFloat(e.target.value) * 100))} /></div>
          <div><label style={labelStyle}>Combo/Full Pass ($)</label><input style={inputStyle} type="number" step="0.01" value={((event.price_combo || 0) / 100).toFixed(2)} onChange={e => updateField('price_combo', Math.round(parseFloat(e.target.value) * 100))} /></div>
        </div>
      </div>

      {/* Limits */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>📏 Entitlement Limits</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><label style={labelStyle}>Daily Member Limit</label><input style={inputStyle} type="number" value={event.daily_member_limit || ''} onChange={e => updateField('daily_member_limit', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Pioneer Guest Limit</label><input style={inputStyle} type="number" value={event.daily_pioneer_guest_limit || ''} onChange={e => updateField('daily_pioneer_guest_limit', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Combo Wristband Qty</label><input style={inputStyle} type="number" value={event.combo_wristband_qty || ''} onChange={e => updateField('combo_wristband_qty', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Pioneer Wristband Qty</label><input style={inputStyle} type="number" value={event.pioneer_wristband_qty || ''} onChange={e => updateField('pioneer_wristband_qty', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Pioneer Parking Qty</label><input style={inputStyle} type="number" value={event.pioneer_parking_qty || ''} onChange={e => updateField('pioneer_parking_qty', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Committee Extra Parking</label><input style={inputStyle} type="number" value={event.committee_extra_parking || ''} onChange={e => updateField('committee_extra_parking', parseInt(e.target.value))} /></div>
        </div>
      </div>

      {/* Venue */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>📍 Venue</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><label style={labelStyle}>Venue Name</label><input style={inputStyle} value={event.venue_name || ''} onChange={e => updateField('venue_name', e.target.value)} /></div>
          <div><label style={labelStyle}>Venue Address</label><input style={inputStyle} value={event.venue_address || ''} onChange={e => updateField('venue_address', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Phone</label><input style={inputStyle} value={event.contact_phone || ''} onChange={e => updateField('contact_phone', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Email</label><input style={inputStyle} value={event.contact_email || ''} onChange={e => updateField('contact_email', e.target.value)} /></div>
        </div>
      </div>

      {/* Checkout Settings */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>⏱️ Checkout & Refund</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><label style={labelStyle}>Price Lock Minutes</label><input style={inputStyle} type="number" value={event.price_lock_minutes || ''} onChange={e => updateField('price_lock_minutes', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Stripe Session Minutes</label><input style={inputStyle} type="number" value={event.stripe_session_minutes || ''} onChange={e => updateField('stripe_session_minutes', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Refund Cutoff Hours</label><input style={inputStyle} type="number" value={event.refund_cutoff_hours || ''} onChange={e => updateField('refund_cutoff_hours', parseInt(e.target.value))} /></div>
        </div>
      </div>
    </div>
  );
}
