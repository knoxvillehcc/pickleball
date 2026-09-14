'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';

const T = (theme) => ({
  card: theme === 'dark' ? '#1e293b' : '#FFFFFF',
  border: theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
  text: theme === 'dark' ? '#F8FAFC' : '#0f172a', muted: theme === 'dark' ? '#94A3B8' : '#64748B',
  primary: '#FF6B35', green: '#34D399', red: '#EF4444', accent: '#FFD700',
});

export default function ManualIssuePage() {
  const { theme } = useTheme();
  const t = T(theme);
  const [eventId, setEventId] = useState(null);
  const [event, setEvent] = useState(null);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    purchaserName: '', purchaserEmail: '', purchaserPhone: '',
    customerType: 'non_member', paymentMethod: 'cash', checkNumber: '',
    orderType: 'daily', reason: '', selectedDates: {},
  });

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/navratri/events');
      const data = await res.json();
      if (data.events?.length) {
        const ev = data.events[0];
        setEventId(ev.id); setEvent(ev);
        const dRes = await fetch(`/api/navratri/events/${ev.id}`);
        const dData = await dRes.json();
        setDates(dData.dates || []);
      }
    })();
  }, []);

  const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const updateDateQty = (dateId, delta) => {
    setForm(prev => {
      const cur = prev.selectedDates[dateId] || 0;
      const next = Math.max(0, Math.min(cur + delta, 10));
      const newDates = { ...prev.selectedDates };
      if (next === 0) delete newDates[dateId]; else newDates[dateId] = next;
      return { ...prev, selectedDates: newDates };
    });
  };

  const getTotal = () => {
    if (!event || form.paymentMethod === 'complimentary') return 0;
    if (form.orderType === 'combo') return (event.price_combo || 35000) / 100;
    let total = 0;
    const price = form.customerType === 'non_member' ? (event.price_nonmember_daily || 3000) / 100 : (event.price_general_daily || 2000) / 100;
    Object.values(form.selectedDates).forEach(qty => { total += price * qty; });
    return total;
  };

  const handleSubmit = async () => {
    setLoading(true); setResult(null);
    try {
      const items = Object.entries(form.selectedDates).map(([dateId, qty]) => ({ dateId: parseInt(dateId), quantity: qty }));
      const res = await fetch('/api/navratri/manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId, purchaserName: form.purchaserName, purchaserEmail: form.purchaserEmail,
          purchaserPhone: form.purchaserPhone, customerType: form.customerType,
          paymentMethod: form.paymentMethod, checkNumber: form.checkNumber,
          orderType: form.orderType, reason: form.reason, items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, ...data });
        setForm({ purchaserName: '', purchaserEmail: '', purchaserPhone: '', customerType: 'non_member', paymentMethod: 'cash', checkNumber: '', orderType: 'daily', reason: '', selectedDates: {} });
      } else {
        setResult({ error: data.error });
      }
    } catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: t.muted, marginBottom: '6px', marginTop: '16px' };

  return (
    <div style={{ padding: '24px 28px', color: t.text, maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>📝 Manual Ticket Issue</h1>
        <a href="/navratri" style={{ color: t.primary, fontSize: '14px', textDecoration: 'none' }}>← Dashboard</a>
      </div>

      {result && (
        <div style={{ padding: '16px 20px', borderRadius: '12px', marginBottom: '20px',
          background: result.error ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${result.error ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}`,
          color: result.error ? t.red : t.green,
        }}>
          {result.error ? `❌ ${result.error}` : `✅ Order ${result.orderNumber} created — ${result.ticketsCreated} ticket(s), $${result.totalAmount?.toFixed(2)}`}
        </div>
      )}

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} value={form.purchaserName} onChange={e => updateField('purchaserName', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label style={labelStyle}>Phone *</label>
            <input style={inputStyle} value={form.purchaserPhone} onChange={e => updateField('purchaserPhone', e.target.value)} placeholder="(865) 555-1234" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.purchaserEmail} onChange={e => updateField('purchaserEmail', e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Customer Type</label>
            <select style={inputStyle} value={form.customerType} onChange={e => updateField('customerType', e.target.value)}>
              <option value="non_member">Non-Member</option>
              <option value="general">General Member</option>
              <option value="pioneer">Pioneer Member</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Payment Method *</label>
            <select style={inputStyle} value={form.paymentMethod} onChange={e => updateField('paymentMethod', e.target.value)}>
              <option value="cash">💵 Cash</option>
              <option value="check">📝 Check</option>
              <option value="complimentary">🎁 Complimentary</option>
            </select>
          </div>
          {form.paymentMethod === 'check' && (
            <div>
              <label style={labelStyle}>Check Number</label>
              <input style={inputStyle} value={form.checkNumber} onChange={e => updateField('checkNumber', e.target.value)} placeholder="#1234" />
            </div>
          )}
        </div>

        <label style={labelStyle}>Reason *</label>
        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.reason}
          onChange={e => updateField('reason', e.target.value)} placeholder="Why is this being issued manually?" />

        {/* Date selection */}
        <label style={{ ...labelStyle, marginTop: '24px' }}>Select Dates</label>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {dates.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{d.label}</span>
                <span style={{ fontSize: '12px', color: t.muted, marginLeft: '8px' }}>{d.event_date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => updateDateQty(d.id, -1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, cursor: 'pointer', fontSize: '16px' }}>−</button>
                <span style={{ fontWeight: '800', minWidth: '20px', textAlign: 'center' }}>{form.selectedDates[d.id] || 0}</span>
                <button onClick={() => updateDateQty(d.id, 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, cursor: 'pointer', fontSize: '16px' }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Total & Submit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '16px 0', borderTop: `2px solid ${t.border}` }}>
          <span style={{ fontSize: '18px', fontWeight: '800' }}>Total: <span style={{ color: t.accent }}>${getTotal().toFixed(2)}</span></span>
          <button onClick={handleSubmit}
            disabled={loading || !form.purchaserName || !form.purchaserPhone || !form.reason || Object.keys(form.selectedDates).length === 0}
            style={{ padding: '14px 32px', borderRadius: '12px', border: 'none', background: t.primary, color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Creating...' : '📝 Issue Tickets'}
          </button>
        </div>
      </div>
    </div>
  );
}
