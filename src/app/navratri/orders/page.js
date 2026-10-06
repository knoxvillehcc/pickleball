'use client';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportPdfWithNativeShare } from '@/lib/pdfShareHelper';
import { useTheme } from '@/components/ClientLayout';
import { colors, spacing, type, radii, btn, input as dsInput, card, chip, table as tableStyle, keyframes } from '@/lib/navratri/designSystem';

export default function OrdersPage() {
  const { theme } = useTheme();
  const c = colors(theme);
  const t = tableStyle(theme);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventId, setEventId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendDone, setResendDone] = useState({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/navratri/events');
      const data = await res.json();
      if (data.events?.length) setEventId(data.events[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!eventId) return;
    loadOrders();
  }, [eventId, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/navratri/orders?eventId=${eventId}&limit=100`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSearch = () => loadOrders();

  const handleRefund = async () => {
    if (!refundModal || !refundReason) return;
    setRefundLoading(true);
    try {
      const res = await fetch('/api/navratri/refunds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: refundModal.id, reason: refundReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRefundModal(null);
        setRefundReason('');
        loadOrders();
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch { alert('Refund failed'); }
    finally { setRefundLoading(false); }
  };

  const handleResend = async (order) => {
    setResendingId(order.id);
    try {
      const res = await fetch('/api/navratri/orders/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (data.success) {
        setResendDone(prev => ({ ...prev, [order.id]: true }));
        setTimeout(() => setResendDone(prev => ({ ...prev, [order.id]: false })), 3000);
      } else {
        alert('Resend failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Resend error: ' + err.message);
    } finally {
      setResendingId(null);
    }
  };

  const downloadPDF = async () => {
    try {
      const doc = new jsPDF('landscape');
      const dateStr = new Date().toLocaleDateString();

      doc.setFontSize(18);
      doc.setTextColor(255, 107, 53); // #FF6B35
      doc.text('Navratri 2026 — Ticket Orders', 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${dateStr}  |  Total Orders: ${orders.length}`, 14, 22);

      const tableBody = orders.map(o => [
        o.order_number || '',
        o.purchaser_name || '',
        o.purchaser_phone || '',
        o.purchaser_email || '',
        (o.order_type || '').replace('_', ' ').toUpperCase(),
        (o.payment_method || '').toUpperCase(),
        '$' + (parseFloat(o.total_amount) || 0).toFixed(2),
        (o.payment_status || '').toUpperCase(),
        o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Order #', 'Name', 'Phone', 'Email', 'Type', 'Method', 'Amount', 'Status', 'Date']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [255, 107, 53] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { top: 10, bottom: 10, left: 14, right: 14 },
      });

      await exportPdfWithNativeShare(doc, `Navratri_Orders_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`;

  return (
    <div style={{ padding: `${spacing.xl}px`, color: c.text, fontFamily: type.fontFamily }}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ ...type.pageTitle, color: c.text, margin: 0 }}>🎫 Orders</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={downloadPDF} style={{
            ...btn('secondary', theme),
            padding: `${spacing.sm}px ${spacing.base}px`,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '700',
          }}>
            📄 Export PDF
          </button>
          <a href="/navratri" style={{ ...type.bodyMedium, color: c.primary, textDecoration: 'none' }}>← Dashboard</a>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name, phone, or order #…"
          style={{ ...dsInput(theme), flex: 1, minWidth: '200px' }} />
        <button onClick={handleSearch} style={{ ...btn('primary', theme), width: 'auto', padding: `${spacing.md}px ${spacing.xl}px` }}>
          Search
        </button>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ ...dsInput(theme), width: 'auto', cursor: 'pointer', appearance: 'auto' }}>
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Orders table */}
      <div style={{ ...card(theme), overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: spacing['3xl'], textAlign: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ ...type.body, color: c.muted }}>Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: spacing['3xl'], textAlign: 'center', color: c.muted, ...type.body }}>No orders found</div>
        ) : (
          <div style={t.wrapper}>
            <table style={t.table}>
              <thead>
                <tr>
                  {['Order #', 'Name', 'Phone', 'Type', 'Method', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={t.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ ...t.row, cursor: 'pointer' }}
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                    <td style={{ ...t.td, ...type.bodyMedium, fontFamily: 'monospace', fontSize: '13px' }}>{order.order_number}</td>
                    <td style={{ ...t.td, ...type.bodyMedium }}>{order.purchaser_name}</td>
                    <td style={t.tdMuted}>{order.purchaser_phone}</td>
                    <td style={t.td}>
                      <span style={chip('active', theme)}>{(order.order_type || '').replace('_', ' ')}</span>
                    </td>
                    <td style={{ ...t.td, textTransform: 'capitalize', ...type.secondary }}>{order.payment_method}</td>
                    <td style={{ ...t.td, ...type.bodyMedium, fontVariantNumeric: 'tabular-nums' }}>{fmt(order.total_amount)}</td>
                    <td style={t.td}>
                      <span style={chip(order.payment_status, theme)}>{chip(order.payment_status, theme)._label || order.payment_status}</span>
                    </td>
                    <td style={t.tdMuted}>
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={t.td}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Edit Button */}
                        <button
                          onClick={e => { e.stopPropagation(); setEditingOrder(order); }}
                          title="Edit order purchaser details"
                          style={{
                            ...btn('secondary', theme),
                            padding: `${spacing.xs}px ${spacing.sm}px`,
                            fontSize: '11px', fontWeight: '700',
                          }}
                        >
                          ✏️ Edit
                        </button>

                        {/* Resend Confirmation */}
                        {order.purchaser_email && (
                          <button
                            onClick={e => { e.stopPropagation(); handleResend(order); }}
                            disabled={resendingId === order.id}
                            title="Resend ticket confirmation email"
                            style={{
                              ...btn('secondary', theme),
                              padding: `${spacing.xs}px ${spacing.sm}px`,
                              fontSize: '11px', fontWeight: '700',
                              color: resendDone[order.id] ? '#10B981' : undefined,
                            }}
                          >
                            {resendingId === order.id ? 'Sending…' : resendDone[order.id] ? '✅ Sent' : '📧 Resend'}
                          </button>
                        )}

                        {/* Refund Button */}
                        {(order.payment_status === 'paid' || order.payment_status === 'partial_refund') && (
                          <button onClick={e => { e.stopPropagation(); setRefundModal(order); }}
                            style={{ ...btn('destructive', theme), padding: `${spacing.xs}px ${spacing.sm}px`, fontSize: '11px' }}>
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail */}
      {selectedOrder && (
        <div style={{ ...card(theme), padding: spacing.xl, marginTop: spacing.base }}>
          <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>Order Detail — {selectedOrder.order_number}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.base }}>
            {[
              ['Name', selectedOrder.purchaser_name, true],
              ['Email', selectedOrder.purchaser_email],
              ['Phone', selectedOrder.purchaser_phone],
              ['Customer', selectedOrder.customer_type],
              ['Stripe Fee', fmt(selectedOrder.stripe_fee)],
              ['Session', selectedOrder.stripe_session_id?.substring(0, 20) + '…'],
            ].map(([label, value, bold]) => (
              <div key={label}>
                <div style={{ ...type.caption, color: c.muted }}>{label}</div>
                <div style={{ ...type.body, ...(bold ? type.bodyMedium : {}), marginTop: '2px', textTransform: label === 'Customer' ? 'capitalize' : 'none' }}>{value}</div>
              </div>
            ))}
          </div>
          {selectedOrder.items?.length > 0 && (
            <div style={{ marginTop: spacing.lg }}>
              <h4 style={{ ...type.overline, color: c.muted, marginBottom: spacing.sm }}>LINE ITEMS</h4>
              {selectedOrder.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing.sm}px 0`, borderBottom: `1px solid ${c.border}`, ...type.secondary }}>
                  <span>{item.ticket_type} × {item.quantity}</span>
                  <span style={type.bodyMedium}>{fmt(item.total_price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refund modal */}
      {refundModal && (
        <div style={{ position: 'fixed', inset: 0, background: c.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: spacing.lg }}
          onClick={() => setRefundModal(null)}>
          <div style={{ ...card(theme, 'elevated'), padding: spacing['2xl'], maxWidth: '440px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ ...type.sectionTitle, color: c.text, marginBottom: spacing.sm }}>↩️ Issue Refund</h3>
            <p style={{ ...type.secondary, color: c.muted, marginBottom: spacing.lg }}>
              {refundModal.order_number} — {refundModal.purchaser_name} — {fmt(refundModal.total_amount)}
            </p>
            <label style={{ ...type.label, color: c.muted }}>Reason *</label>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)}
              rows={3} placeholder="Why are you issuing this refund?"
              style={{ ...dsInput(theme), marginTop: spacing.xs, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg }}>
              <button onClick={() => setRefundModal(null)} style={{ ...btn('secondary', theme), flex: 1 }}>Cancel</button>
              <button onClick={handleRefund} disabled={!refundReason || refundLoading}
                style={{ ...btn('destructive', theme), flex: 1, opacity: !refundReason || refundLoading ? 0.5 : 1 }}>
                {refundLoading ? 'Processing…' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          theme={theme}
          onClose={() => setEditingOrder(null)}
          onSave={(updated) => {
            setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
            if (selectedOrder?.id === updated.id) {
              setSelectedOrder(prev => ({ ...prev, ...updated }));
            }
            loadOrders();
          }}
        />
      )}
    </div>
  );
}

function EditOrderModal({ order, theme, onClose, onSave }) {
  const c = colors(theme);
  const [form, setForm] = useState({
    purchaser_name: order.purchaser_name || '',
    purchaser_email: order.purchaser_email || '',
    purchaser_phone: order.purchaser_phone || '',
    payment_status: order.payment_status || 'paid',
    customer_type: order.customer_type || 'general',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/navratri/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, ...form }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update order');
      onSave(data.order);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: c.card, border: `1px solid ${c.border}`,
        borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: c.text }}>✏️ Edit Order</h3>
            <div style={{ fontSize: '12px', color: c.muted, fontFamily: 'monospace', marginTop: '2px' }}>{order.order_number}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', color: '#EF4444', fontSize: '12px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Purchaser Name</label>
            <input value={form.purchaser_name} onChange={e => setForm(f => ({ ...f, purchaser_name: e.target.value }))} required style={dsInput(theme)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Email</label>
            <input type="email" value={form.purchaser_email} onChange={e => setForm(f => ({ ...f, purchaser_email: e.target.value }))} style={dsInput(theme)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Phone</label>
            <input value={form.purchaser_phone} onChange={e => setForm(f => ({ ...f, purchaser_phone: e.target.value }))} style={dsInput(theme)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Payment Status</label>
            <select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))} style={{ ...dsInput(theme), cursor: 'pointer', appearance: 'auto' }}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial_refund">Partial Refund</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ ...btn('secondary', theme), flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...btn('primary', theme), flex: 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
