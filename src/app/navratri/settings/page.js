'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';
import { colors, spacing, type, radii, btn, input as dsInput, card, keyframes, alert as alertStyle } from '@/lib/navratri/designSystem';

export default function SettingsPage() {
  const { theme } = useTheme();
  const c = colors(theme);

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
      if (data.success) { setMessage({ type: 'success', text: 'Settings saved!' }); }
      else { setMessage({ type: 'error', text: data.error }); }
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
      if (data.success) { setEvent(data.event); setMessage({ type: 'success', text: `Status changed to ${newStatus}` }); }
      else { setMessage({ type: 'error', text: data.error }); }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ padding: spacing['3xl'], textAlign: 'center' }}>
      <style>{keyframes}</style>
      <div style={{ width: '32px', height: '32px', border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );
  if (!event) return <div style={{ padding: spacing['3xl'], color: c.red, ...type.body }}>No event found. Create one first.</div>;

  const labelStyle = { ...type.label, color: c.muted, display: 'block', marginBottom: spacing.xs };
  const inputS = dsInput(theme);
  const sectionCard = { ...card(theme), padding: spacing.xl, marginBottom: spacing.lg };
  const toggleStyle = (on) => ({
    padding: `${spacing.sm}px ${spacing.lg}px`, borderRadius: `${radii.sm}px`, border: 'none', cursor: 'pointer',
    ...type.bodyMedium,
    background: on ? c.greenBg : c.redBg,
    color: on ? c.green : c.red,
  });

  return (
    <div style={{ padding: `${spacing.xl}px`, color: c.text, maxWidth: '800px', fontFamily: type.fontFamily }}>
      <style>{keyframes}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, flexWrap: 'wrap', gap: spacing.md }}>
        <h1 style={{ ...type.pageTitle, color: c.text, margin: 0 }}>⚙️ Event Settings</h1>
        <div style={{ display: 'flex', gap: spacing.md }}>
          <a href="/navratri" style={{ ...btn('secondary', theme), textDecoration: 'none', ...type.caption }}>← Dashboard</a>
          <button onClick={handleSave} disabled={saving}
            style={{ ...btn('primary', theme), width: 'auto', ...type.caption, opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ ...alertStyle(message.type, theme), marginBottom: spacing.base }}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* Status */}
      <div style={sectionCard}>
        <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>📊 Event Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.base, flexWrap: 'wrap' }}>
          <span style={{ ...type.bodyMedium, textTransform: 'capitalize' }}>Current: {event.status}</span>
          {event.status === 'draft' && <button onClick={() => handleStatusChange('published')} style={toggleStyle(true)}>Publish</button>}
          {event.status === 'published' && <button onClick={() => handleStatusChange('active')} style={toggleStyle(true)}>Activate</button>}
          {event.status === 'active' && <button onClick={() => handleStatusChange('completed')} style={toggleStyle(false)}>Complete</button>}
        </div>
      </div>

      {/* Sales Toggles */}
      <div style={sectionCard}>
        <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>🛒 Sales Controls</h3>
        <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' }}>
          <div>
            <span style={labelStyle}>Daily Ticket Sales</span>
            <button onClick={() => updateField('daily_sales_open', !event.daily_sales_open)} style={toggleStyle(event.daily_sales_open)}>
              {event.daily_sales_open ? '✅ Open' : '❌ Closed'}
            </button>
          </div>
          <div>
            <span style={labelStyle}>Combo Pass Sales</span>
            <button onClick={() => updateField('combo_sales_open', !event.combo_sales_open)} style={toggleStyle(event.combo_sales_open)}>
              {event.combo_sales_open ? '✅ Open' : '❌ Closed'}
            </button>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={sectionCard}>
        <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>💰 Pricing</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.base }}>
          <div><label style={labelStyle}>General Daily ($)</label><input style={inputS} type="number" step="0.01" value={((event.price_general_daily || 0) / 100).toFixed(2)} onChange={e => updateField('price_general_daily', Math.round(parseFloat(e.target.value) * 100))} /></div>
          <div><label style={labelStyle}>Pioneer Guest Daily ($)</label><input style={inputS} type="number" step="0.01" value={((event.price_pioneer_guest_daily || 0) / 100).toFixed(2)} onChange={e => updateField('price_pioneer_guest_daily', Math.round(parseFloat(e.target.value) * 100))} /></div>
          <div><label style={labelStyle}>Non-Member Daily ($)</label><input style={inputS} type="number" step="0.01" value={((event.price_nonmember_daily || 0) / 100).toFixed(2)} onChange={e => updateField('price_nonmember_daily', Math.round(parseFloat(e.target.value) * 100))} /></div>
          <div><label style={labelStyle}>Combo/Full Pass ($)</label><input style={inputS} type="number" step="0.01" value={((event.price_combo || 0) / 100).toFixed(2)} onChange={e => updateField('price_combo', Math.round(parseFloat(e.target.value) * 100))} /></div>
        </div>
      </div>

      {/* Limits */}
      <div style={sectionCard}>
        <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>📏 Entitlement Limits</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.base }}>
          <div><label style={labelStyle}>Daily Member Limit</label><input style={inputS} type="number" value={event.daily_member_limit || ''} onChange={e => updateField('daily_member_limit', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Pioneer Guest Limit</label><input style={inputS} type="number" value={event.daily_pioneer_guest_limit || ''} onChange={e => updateField('daily_pioneer_guest_limit', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Combo Wristband Qty</label><input style={inputS} type="number" value={event.combo_wristband_qty || ''} onChange={e => updateField('combo_wristband_qty', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Pioneer Wristband Qty</label><input style={inputS} type="number" value={event.pioneer_wristband_qty || ''} onChange={e => updateField('pioneer_wristband_qty', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Pioneer Parking Qty</label><input style={inputS} type="number" value={event.pioneer_parking_qty || ''} onChange={e => updateField('pioneer_parking_qty', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Committee Extra Parking</label><input style={inputS} type="number" value={event.committee_extra_parking || ''} onChange={e => updateField('committee_extra_parking', parseInt(e.target.value))} /></div>
        </div>
      </div>

      {/* Venue */}
      <div style={sectionCard}>
        <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>📍 Venue</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.base }}>
          <div><label style={labelStyle}>Venue Name</label><input style={inputS} value={event.venue_name || ''} onChange={e => updateField('venue_name', e.target.value)} /></div>
          <div><label style={labelStyle}>Venue Address</label><input style={inputS} value={event.venue_address || ''} onChange={e => updateField('venue_address', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Phone</label><input style={inputS} value={event.contact_phone || ''} onChange={e => updateField('contact_phone', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Email</label><input style={inputS} value={event.contact_email || ''} onChange={e => updateField('contact_email', e.target.value)} /></div>
        </div>
      </div>

      {/* Checkout */}
      <div style={sectionCard}>
        <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>⏱️ Checkout & Refund</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing.base }}>
          <div><label style={labelStyle}>Price Lock Minutes</label><input style={inputS} type="number" value={event.price_lock_minutes || ''} onChange={e => updateField('price_lock_minutes', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Stripe Session Minutes</label><input style={inputS} type="number" value={event.stripe_session_minutes || ''} onChange={e => updateField('stripe_session_minutes', parseInt(e.target.value))} /></div>
          <div><label style={labelStyle}>Refund Cutoff Hours</label><input style={inputS} type="number" value={event.refund_cutoff_hours || ''} onChange={e => updateField('refund_cutoff_hours', parseInt(e.target.value))} /></div>
        </div>
      </div>
    </div>
  );
}
