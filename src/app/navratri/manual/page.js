'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';
import { colors, spacing, type, radii, btn, input as dsInput, card, keyframes, alert as alertStyle } from '@/lib/navratri/designSystem';

export default function ManualIssuePage() {
  const { theme } = useTheme();
  const c = colors(theme);

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

  const labelStyle = { ...type.label, color: c.muted, display: 'block', marginBottom: spacing.xs, marginTop: spacing.base };
  const inputS = dsInput(theme);

  return (
    <div style={{ padding: `${spacing.xl}px`, color: c.text, maxWidth: '700px', fontFamily: type.fontFamily }}>
      <style>{keyframes}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <h1 style={{ ...type.pageTitle, color: c.text, margin: 0 }}>📝 Manual Ticket Issue</h1>
        <a href="/navratri" style={{ ...type.bodyMedium, color: c.primary, textDecoration: 'none' }}>← Dashboard</a>
      </div>

      {result && (
        <div style={{ ...alertStyle(result.error ? 'error' : 'success', theme), marginBottom: spacing.lg }}>
          {result.error ? `❌ ${result.error}` : `✅ Order ${result.orderNumber} created — ${result.ticketsCreated} ticket(s), $${result.totalAmount?.toFixed(2)}`}
        </div>
      )}

      <div style={{ ...card(theme), padding: spacing.xl }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `0 ${spacing.lg}px` }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputS} value={form.purchaserName} onChange={e => updateField('purchaserName', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label style={labelStyle}>Phone *</label>
            <input style={inputS} value={form.purchaserPhone} onChange={e => updateField('purchaserPhone', e.target.value)} placeholder="(865) 555-1234" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputS} value={form.purchaserEmail} onChange={e => updateField('purchaserEmail', e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Customer Type</label>
            <select style={{ ...inputS, cursor: 'pointer', appearance: 'auto' }} value={form.customerType} onChange={e => updateField('customerType', e.target.value)}>
              <option value="non_member">Non-Member</option>
              <option value="general">General Member</option>
              <option value="pioneer">Pioneer Member</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Payment Method *</label>
            <select style={{ ...inputS, cursor: 'pointer', appearance: 'auto' }} value={form.paymentMethod} onChange={e => updateField('paymentMethod', e.target.value)}>
              <option value="cash">💵 Cash</option>
              <option value="check">📝 Check</option>
              <option value="complimentary">🎁 Complimentary</option>
            </select>
          </div>
          {form.paymentMethod === 'check' && (
            <div>
              <label style={labelStyle}>Check Number</label>
              <input style={inputS} value={form.checkNumber} onChange={e => updateField('checkNumber', e.target.value)} placeholder="#1234" />
            </div>
          )}
        </div>

        <label style={{ ...labelStyle, marginTop: spacing.lg }}>Reason *</label>
        <textarea style={{ ...inputS, resize: 'vertical' }} rows={2} value={form.reason}
          onChange={e => updateField('reason', e.target.value)} placeholder="Why is this being issued manually?" />

        {/* Date selection */}
        <label style={{ ...labelStyle, marginTop: spacing.xl }}>Select Dates</label>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {dates.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing.md}px 0`, borderBottom: `1px solid ${c.border}` }}>
              <div>
                <span style={{ ...type.bodyMedium, color: c.text }}>{d.label}</span>
                <span style={{ ...type.caption, color: c.muted, marginLeft: spacing.sm }}>{d.event_date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <button onClick={() => updateDateQty(d.id, -1)} style={{
                  width: '36px', height: '36px', borderRadius: `${radii.sm}px`,
                  border: `1px solid ${c.border}`, background: 'transparent',
                  color: c.text, cursor: 'pointer', fontSize: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>−</button>
                <span style={{ ...type.bodyMedium, minWidth: '20px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{form.selectedDates[d.id] || 0}</span>
                <button onClick={() => updateDateQty(d.id, 1)} style={{
                  width: '36px', height: '36px', borderRadius: `${radii.sm}px`,
                  border: `1px solid ${c.border}`, background: 'transparent',
                  color: c.text, cursor: 'pointer', fontSize: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Total & Submit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, paddingTop: spacing.base, borderTop: `2px solid ${c.border}` }}>
          <span style={type.sectionTitle}>
            Total: <span style={{ color: c.accent }}>${getTotal().toFixed(2)}</span>
          </span>
          <button onClick={handleSubmit}
            disabled={loading || !form.purchaserName || !form.purchaserPhone || !form.reason || Object.keys(form.selectedDates).length === 0}
            style={{ ...btn('primary', theme), width: 'auto', padding: `${spacing.md}px ${spacing['2xl']}px`, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Creating…' : '📝 Issue Tickets'}
          </button>
        </div>
      </div>
    </div>
  );
}
