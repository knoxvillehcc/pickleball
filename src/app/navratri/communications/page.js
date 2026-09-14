'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';

const T = (theme) => ({
  card: theme === 'dark' ? '#1e293b' : '#FFFFFF',
  border: theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
  text: theme === 'dark' ? '#F8FAFC' : '#0f172a', muted: theme === 'dark' ? '#94A3B8' : '#64748B',
  primary: '#FF6B35', green: '#34D399', red: '#EF4444', accent: '#FFD700', blue: '#60A5FA',
});

export default function CommunicationsPage() {
  const { theme } = useTheme();
  const t = T(theme);
  const [eventId, setEventId] = useState(null);
  const [dates, setDates] = useState([]);
  const [tab, setTab] = useState('reminder');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Reminder state
  const [reminderDateId, setReminderDateId] = useState('');
  // Announcement state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState(['email', 'sms']);
  // Test state
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

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: t.muted, marginBottom: '6px', marginTop: '16px' };

  return (
    <div style={{ padding: '24px 28px', color: t.text, maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>📢 Communications</h1>
        <a href="/navratri" style={{ color: t.primary, fontSize: '14px', textDecoration: 'none' }}>← Dashboard</a>
      </div>

      {result && (
        <div style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '16px',
          background: result.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
          color: result.type === 'error' ? t.red : t.green, fontSize: '14px',
        }}>{result.type === 'error' ? '❌' : '✅'} {result.text}</div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: '12px', padding: '4px' }}>
        {[
          { key: 'reminder', label: '⏰ Reminder' },
          { key: 'announcement', label: '📢 Announcement' },
          { key: 'test', label: '🧪 Test' },
        ].map(tb => (
          <button key={tb.key} onClick={() => { setTab(tb.key); setResult(null); }} style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: '600',
            background: tab === tb.key ? t.primary : 'transparent',
            color: tab === tb.key ? 'white' : t.muted, cursor: 'pointer',
          }}>{tb.label}</button>
        ))}
      </div>

      {/* Channel selector */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>📡 Channels</h3>
        <div style={{ display: 'flex', gap: '16px' }}>
          {['email', 'sms'].map(ch => (
            <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={channels.includes(ch)}
                onChange={e => {
                  if (e.target.checked) setChannels([...channels, ch]);
                  else setChannels(channels.filter(c => c !== ch));
                }}
                style={{ width: '18px', height: '18px', accentColor: t.primary }} />
              <span style={{ fontSize: '14px', fontWeight: '600', textTransform: 'capitalize' }}>
                {ch === 'email' ? '📧 Email' : '📱 SMS'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── REMINDER ──────────────────────────────────────────────────── */}
      {tab === 'reminder' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>⏰ Send Reminder</h3>
          <p style={{ color: t.muted, fontSize: '13px', marginBottom: '20px' }}>
            Send a reminder to all ticket holders for a specific date.
          </p>

          <label style={labelStyle}>Select Event Date *</label>
          <select value={reminderDateId} onChange={e => setReminderDateId(e.target.value)} style={inputStyle}>
            <option value="">Choose a date...</option>
            {dates.map(d => (
              <option key={d.id} value={d.id}>{d.label} — {d.event_date}</option>
            ))}
          </select>

          <button onClick={() => handleSend('reminder', { eventDateId: parseInt(reminderDateId) })}
            disabled={loading || !reminderDateId}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: t.accent, color: '#000', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '20px', opacity: loading || !reminderDateId ? 0.5 : 1 }}>
            {loading ? 'Sending...' : '⏰ Send Reminder'}
          </button>
        </div>
      )}

      {/* ── ANNOUNCEMENT ──────────────────────────────────────────────── */}
      {tab === 'announcement' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>📢 Send Announcement</h3>
          <p style={{ color: t.muted, fontSize: '13px', marginBottom: '20px' }}>
            Send a message to ALL ticket holders (deduplicated by phone).
          </p>

          <label style={labelStyle}>Subject *</label>
          <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Schedule Change — Day 3" />

          <label style={labelStyle}>Message *</label>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={5} value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your announcement message here..." />

          <button onClick={() => handleSend('announcement', { subject, message })}
            disabled={loading || !subject || !message}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: t.primary, color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '20px', opacity: loading || !subject || !message ? 0.5 : 1 }}>
            {loading ? 'Sending...' : '📢 Send to All Ticket Holders'}
          </button>
        </div>
      )}

      {/* ── TEST ──────────────────────────────────────────────────────── */}
      {tab === 'test' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>🧪 Test Send</h3>
          <p style={{ color: t.muted, fontSize: '13px', marginBottom: '20px' }}>
            Send a test message to your admin email. Optionally include a phone for SMS test.
          </p>

          <label style={labelStyle}>Subject</label>
          <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Test Subject" />

          <label style={labelStyle}>Message</label>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={message}
            onChange={e => setMessage(e.target.value)} placeholder="Test message body..." />

          <label style={labelStyle}>Test Phone (optional)</label>
          <input style={inputStyle} value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="(865) 555-1234" />

          <button onClick={() => handleSend('test', { subject, message, testPhone })}
            disabled={loading}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: t.blue, color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '20px', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Sending...' : '🧪 Send Test'}
          </button>
        </div>
      )}
    </div>
  );
}
