'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';
import { colors, spacing, type, radii, btn, input as dsInput, card, keyframes, alert as alertStyle } from '@/lib/navratri/designSystem';

export default function CommunicationsPage() {
  const { theme } = useTheme();
  const c = colors(theme);

  const [eventId, setEventId] = useState(null);
  const [dates, setDates] = useState([]);
  const [tab, setTab] = useState('reminder');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [reminderDateId, setReminderDateId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState(['email', 'sms']);
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/navratri/events');
      const data = await res.json();
      if (data.events?.length) {
        const ev = data.events[0];
        setEventId(ev.id);
        const dRes = await fetch(`/api/navratri/events/${ev.id}`);
        const dData = await dRes.json();
        setDates(dData.dates || []);
      }
    })();
  }, []);

  const handleSend = async (action, body) => {
    if (!confirm(`Are you sure you want to send this ${action}? This cannot be undone.`)) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/navratri/communications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, eventId, channels, ...body }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'success', text: `${action === 'reminder' ? 'Reminder' : 'Announcement'} sent to ${data.sentCount} recipient(s). ${data.errorCount || 0} failed.` });
      } else {
        setResult({ type: 'error', text: data.error });
      }
    } catch (err) { setResult({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  const labelStyle = { ...type.label, color: c.muted, display: 'block', marginBottom: spacing.xs, marginTop: spacing.base };
  const inputS = dsInput(theme);

  return (
    <div style={{ padding: `${spacing.xl}px`, color: c.text, maxWidth: '700px', fontFamily: type.fontFamily }}>
      <style>{keyframes}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <h1 style={{ ...type.pageTitle, color: c.text, margin: 0 }}>📢 Communications</h1>
        <a href="/navratri" style={{ ...type.bodyMedium, color: c.primary, textDecoration: 'none' }}>← Dashboard</a>
      </div>

      {result && (
        <div style={{ ...alertStyle(result.type, theme), marginBottom: spacing.base }}>
          {result.type === 'error' ? '❌' : '✅'} {result.text}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '3px', marginBottom: spacing.xl, background: c.inputBg, borderRadius: `${radii.md}px`, padding: '3px' }}>
        {[
          { key: 'reminder', label: '⏰ Reminder' },
          { key: 'announcement', label: '📢 Announcement' },
          { key: 'test', label: '🧪 Test' },
        ].map(tb => (
          <button key={tb.key} onClick={() => { setTab(tb.key); setResult(null); }} style={{
            padding: `${spacing.sm}px ${spacing.base}px`, borderRadius: `${radii.sm}px`, border: 'none',
            ...type.bodyMedium, fontSize: '14px',
            background: tab === tb.key ? c.primary : 'transparent',
            color: tab === tb.key ? '#fff' : c.muted, cursor: 'pointer', transition: 'all 0.15s',
          }}>{tb.label}</button>
        ))}
      </div>

      {/* Channel selector */}
      <div style={{ ...card(theme), padding: spacing.lg, marginBottom: spacing.lg }}>
        <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.md }}>📡 Channels</h3>
        <div style={{ display: 'flex', gap: spacing.base }}>
          {['email', 'sms'].map(ch => (
            <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
              <input type="checkbox" checked={channels.includes(ch)}
                onChange={e => {
                  if (e.target.checked) setChannels([...channels, ch]);
                  else setChannels(channels.filter(cc => cc !== ch));
                }}
                style={{ width: '20px', height: '20px', accentColor: c.primary }} />
              <span style={{ ...type.bodyMedium, textTransform: 'capitalize' }}>
                {ch === 'email' ? '📧 Email' : '📱 SMS'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* REMINDER */}
      {tab === 'reminder' && (
        <div style={{ ...card(theme), padding: spacing.xl }}>
          <h3 style={{ ...type.sectionTitle, color: c.text, marginBottom: spacing.xs }}>⏰ Send Reminder</h3>
          <p style={{ ...type.secondary, color: c.muted, marginBottom: spacing.lg }}>
            Send a reminder to all ticket holders for a specific date.
          </p>
          <label style={labelStyle}>Select Event Date *</label>
          <select value={reminderDateId} onChange={e => setReminderDateId(e.target.value)}
            style={{ ...inputS, cursor: 'pointer', appearance: 'auto' }}>
            <option value="">Choose a date…</option>
            {dates.map(d => <option key={d.id} value={d.id}>{d.label} — {d.event_date}</option>)}
          </select>
          <button onClick={() => handleSend('reminder', { eventDateId: parseInt(reminderDateId) })}
            disabled={loading || !reminderDateId}
            style={{ ...btn('primaryLg', theme), marginTop: spacing.lg, background: c.accent, color: '#000', opacity: loading || !reminderDateId ? 0.5 : 1 }}>
            {loading ? 'Sending…' : '⏰ Send Reminder'}
          </button>
        </div>
      )}

      {/* ANNOUNCEMENT */}
      {tab === 'announcement' && (
        <div style={{ ...card(theme), padding: spacing.xl }}>
          <h3 style={{ ...type.sectionTitle, color: c.text, marginBottom: spacing.xs }}>📢 Send Announcement</h3>
          <p style={{ ...type.secondary, color: c.muted, marginBottom: spacing.lg }}>
            Send a message to ALL ticket holders (deduplicated by phone).
          </p>
          <label style={labelStyle}>Subject *</label>
          <input style={inputS} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Schedule Change — Day 3" />
          <label style={labelStyle}>Message *</label>
          <textarea style={{ ...inputS, resize: 'vertical' }} rows={5} value={message}
            onChange={e => setMessage(e.target.value)} placeholder="Type your announcement message here…" />
          <button onClick={() => handleSend('announcement', { subject, message })}
            disabled={loading || !subject || !message}
            style={{ ...btn('primaryLg', theme), marginTop: spacing.lg, opacity: loading || !subject || !message ? 0.5 : 1 }}>
            {loading ? 'Sending…' : '📢 Send to All Ticket Holders'}
          </button>
        </div>
      )}

      {/* TEST */}
      {tab === 'test' && (
        <div style={{ ...card(theme), padding: spacing.xl }}>
          <h3 style={{ ...type.sectionTitle, color: c.text, marginBottom: spacing.xs }}>🧪 Test Send</h3>
          <p style={{ ...type.secondary, color: c.muted, marginBottom: spacing.lg }}>
            Send a test message to your admin email. Optionally include a phone for SMS test.
          </p>
          <label style={labelStyle}>Subject</label>
          <input style={inputS} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Test Subject" />
          <label style={labelStyle}>Message</label>
          <textarea style={{ ...inputS, resize: 'vertical' }} rows={3} value={message}
            onChange={e => setMessage(e.target.value)} placeholder="Test message body…" />
          <label style={labelStyle}>Test Phone (optional)</label>
          <input style={inputS} value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="(865) 555-1234" />
          <button onClick={() => handleSend('test', { subject, message, testPhone })}
            disabled={loading}
            style={{ ...btn('primaryLg', theme), marginTop: spacing.lg, background: c.blue, color: '#fff', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Sending…' : '🧪 Send Test'}
          </button>
        </div>
      )}
    </div>
  );
}
